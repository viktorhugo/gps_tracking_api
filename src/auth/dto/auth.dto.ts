import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginDto {
    @IsNotEmpty()
    @IsEmail()
    readonly email: string;

    @IsNotEmpty()
    readonly password: string;
}

export class NewUserMessageDto {
    @IsNotEmpty()
    readonly from: string;

    @IsNotEmpty()
    readonly to: string;

    @IsNotEmpty()
    readonly message: string;
}

export class NewUserMessageLocationDto {
    @IsNotEmpty()
    readonly latitude: string;

    @IsNotEmpty()
    readonly longitude: string;
}

export class RequestUserMessageLocationDto {  
    event: string;  
    data: {
        latitude: string;
        longitude: string;
        from: string;
    }
}

export class RequestUserMessageDto {    
    message: string;
    event: string;
    to: string;
    from: string;
}
export class RequestNewUserStatusConnected {    
    event: string;
    connected: boolean;
    uuid: string;
}
