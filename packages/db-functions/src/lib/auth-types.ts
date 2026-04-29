import type { ConvoSignInJwtValue } from "@convo-lang/convo-lang";

export interface CreateUserSignRequest extends Omit<ConvoSignInJwtValue,'id'>
{
    otpSecret?:string;
    password?:string;
}

export interface UserSignIn
{
    passwordHash?:string;
    otpSecret?:string;
    jwt:ConvoSignInJwtValue;
}


export interface CreateOtpLinkRequest
{
    issuer:string;
    label:string;
}

export interface VerifyOptRequest
{
    secret:string;
    token:string;
}