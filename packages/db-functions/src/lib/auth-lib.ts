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

export async function getEncryptionKey(password:string)
{
    const enc=new TextEncoder();
    const keyMaterial=await globalThis.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        {name:'PBKDF2'},
        false,
        ['deriveKey'],
    );

    return globalThis.crypto.subtle.deriveKey(
        {
            name:'PBKDF2',
            salt:enc.encode('some-static-salt'), // Use a unique salt in production
            iterations:100000,
            hash:'SHA-256',
        },
        keyMaterial,
        {name:'AES-GCM',length:256},
        false,
        ['encrypt','decrypt'],
    );
}

// ENCRYPT: Returns a JSON string containing hex-encoded IV and Ciphertext
export async function encryptSecret(unencryptedData:string,password:string):Promise<string>
{
    const enc=new TextEncoder();
    const key=await getEncryptionKey(password);
    const iv=globalThis.crypto.getRandomValues(new Uint8Array(12)); // GCM standard IV is 12 bytes

    const encryptedContent=await globalThis.crypto.subtle.encrypt(
        {name:'AES-GCM',iv:iv},
        key,
        enc.encode(unencryptedData),
    );

    return JSON.stringify({
        iv:Array.from(iv).map(b=>b.toString(16).padStart(2,'0')).join(''),
        content:Array.from(new Uint8Array(encryptedContent)).map(b=>b.toString(16).padStart(2,'0')).join(''),
    });
}

// DECRYPT: Takes the JSON string and returns the original secret
export async function decryptSecret(encryptedData:string,password:string):Promise<string>
{
    const data=JSON.parse(encryptedData);
    const key=await getEncryptionKey(password);

    const iv=new Uint8Array(data.iv.match(/.{1,2}/g).map((byte:any)=>parseInt(byte,16)));
    const content=new Uint8Array(data.content.match(/.{1,2}/g).map((byte:any)=>parseInt(byte,16)));

    const decrypted=await globalThis.crypto.subtle.decrypt(
        {name:'AES-GCM',iv:iv},
        key,
        content,
    );

    return new TextDecoder().decode(decrypted);
}