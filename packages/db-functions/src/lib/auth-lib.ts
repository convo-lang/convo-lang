import { PromiseResultType, ResultType } from '@convo-lang/convo-lang';

export const authSecretsPath='/secrets/auth-secrets'

export const invalidSignIn:ResultType<any>={
    success:false,
    error:'Invalid sign-in',
    statusCode:401,
};

export const hashPasswordAsync=async (password:string,passwordSalt:string):PromiseResultType<string>=>
{
    if(!globalThis.crypto){
        console.error('globalThis.crypto not defined');
        return invalidSignIn;
    }

    try{

        const encoder=new TextEncoder();
        const keyMaterial=await globalThis.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            {name:'PBKDF2'},
            false,
            ['deriveKey']
        );

        const derivedKey=await globalThis.crypto.subtle.deriveKey(
            {
                name:'PBKDF2',
                salt:encoder.encode(passwordSalt),
                iterations:600000,
                hash:'SHA-256',
            },
            keyMaterial,
            {name:'HMAC',hash:'SHA-256'},
            true,
            ['sign']
        );

        const hashBuffer=await globalThis.crypto.subtle.exportKey('raw',derivedKey);

        return {
            success:true,
            result:new Uint8Array(hashBuffer).toBase64(),
        };
    }catch(ex){
        console.error('Password hashing failed', ex);
        return invalidSignIn;
    }
};

export const getRandom=()=>{
    const ary=(globalThis.crypto.randomUUID()+'-'+globalThis.crypto.randomUUID()+'-'+Math.round(Math.random()*10000)+'-'+globalThis.crypto.randomUUID()+'-'+Math.round(Math.random()*10000)).split('-');
    ary.sort(()=>Math.random()-Math.random());
    return ary.join('');
}
