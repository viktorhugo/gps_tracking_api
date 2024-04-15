import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets';
import { Socket } from 'dgram';
import 'dotenv/config';
import { NewUserMessageDto, NewUserMessageLocationDto, RequestNewUserStatusConnected, RequestUserMessageDto, RequestUserMessageLocationDto } from 'src/auth/dto/auth.dto';
import { MessageService } from 'src/messages/services/message.service';
import { Server } from 'ws';
    
@WebSocketGateway( 
    Number(process.env.WEBSOCKET_PORT),  
    { 
        transports: ['websocket'],
        cors: { origin: '*' },
    } 
)
export class EventsGateway {
    
    constructor(
        private messageService: MessageService,
    ){ }

    @WebSocketServer()
    server: Server;
    public users: Socket[] = [];
    public dashboardClient: Socket;

    // this execute after Init listen websocket
    afterInit() {
        console.warn(`Init WebSocket Server - Port:${process.env.WEBSOCKET_PORT}`);
    }


    //* =======================================================================================
    //*                                HANDLE WSS CONNECTION
    //* =======================================================================================

    // validate Connection with webSocket
    public async handleConnection(@ConnectedSocket() client, req: Request) {

        const dashboard = req.headers['x-dashboard'];
        console.log(req.url);
        
        if (req.url.indexOf('dashboardId=') > 0) {
            const dashboardId = req.url.substring(req.url.indexOf('=') + 1);
            client['x-dashboard'] = dashboardId;
            this.dashboardClient = client;
            console.log(`Client Dashboard connected: ${this.dashboardClient['x-dashboard']}`);
        } else {
            await this.AddClient(client);
        }
        // if (!token) {
        //     console.error('Missing auth token for connection');
        //     return client.close();
        // }
        // const pr = await this.AddClient(token, client);
        // if (!pr){
        //     console.error('Error token expired');
        //     return client.close();
        // } 
    }

    public async AddClient( client: Socket) {
        try {
            this.users.push(client);
            console.log(`Client connected, Total UsersConnected: ${this.users.length}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    // method listen when client disconnected
    public async handleDisconnect(@ConnectedSocket() client: Socket) {
        // check if public api node
        if( client['x-dashboard'] ) {
            this.dashboardClient = null;
            console.log(`Dashboard Client Disconnected: ${client['x-dashboard']}`);
        } else {
            this.users = this.users.filter(item => item['uuid'] !== client['uuid']);
            console.log(`Client Disconnected, Total UsersConnected: ${this.users.length}`);
            // this.notificationUserChangedStatusConnected(client['uuid'], false);
        }
    }



    //* =======================================================================================
    //*                                HANDLE EVENTS
    //* =======================================================================================

    @SubscribeMessage('user-message')
    public async handleEventCreateBand( @ConnectedSocket() client: Socket, @MessageBody() data: NewUserMessageDto ) {
        const { from, to, message } = data;
        
        const requestUserMessageDto =  new RequestUserMessageDto();
        requestUserMessageDto.event = 'user-message';
        requestUserMessageDto.from = from;
        requestUserMessageDto.to = to;
        requestUserMessageDto.message = message;
        //* save messages in db
        await this.messageService.saveMessage(requestUserMessageDto)
        //* send message to user
        const findClient = this.users.find(item => item['uuid'] === to);
        if (findClient) {
            // console.log('findClient', findClient['uuid']);
            findClient.send(JSON.stringify(requestUserMessageDto));
        }
        // return data;
    }
    
    @SubscribeMessage('user-send-location')
    public async handleEventSendLocation( @ConnectedSocket() client: Socket, @MessageBody() data: NewUserMessageLocationDto ) {
        const { latitude, longitude } = data;
        console.log(data);
        const requestUserMessageDto =  new RequestUserMessageLocationDto();

        const dataLocation = {
            latitude: latitude,
            longitude: longitude,
            from: client['uuid'],
        }
        requestUserMessageDto.event = 'dashboard-send-location';
        requestUserMessageDto.data =  dataLocation;
        if (this.dashboardClient) {
            this.dashboardClient.send(JSON.stringify(requestUserMessageDto));
        }
        // return data;
    }


    //* =======================================================================================
    //*                                METHODS
    //* =======================================================================================

    public async notificationUserChangedStatusConnected(myUUID: string, connected: boolean) {
        if ( this.users.length === 0 ) return; 
        this.users.forEach(user => {
            if (user['uuid'] !== myUUID ) {
                const requestUserMessageDto =  new RequestNewUserStatusConnected();
                requestUserMessageDto.event = 'user-changed-status-connected';
                requestUserMessageDto.connected = connected;
                requestUserMessageDto.uuid = user['uuid'];
                user.send(JSON.stringify(requestUserMessageDto));
            }
        });
    }

}