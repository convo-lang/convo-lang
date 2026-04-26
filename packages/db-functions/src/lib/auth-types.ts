import type { ConvoSignInJwtValue } from "@convo-lang/convo-lang";

export interface CreateUserSignRequest extends Omit<ConvoSignInJwtValue,'id'>
{
    password:string;
}

export interface UserSignIn
{
    passwordHash?:string;
    jwt:ConvoSignInJwtValue;
}


