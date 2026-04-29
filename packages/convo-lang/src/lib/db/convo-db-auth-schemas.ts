import { z } from 'zod';

export const ConvoSignInJwtValueSchema=z.object({
    
    /**
     * Unique user id
     */
    id:z.string(),

    /**
     * Paths the sign-in can assume the identity of.
     */
    identityPaths:z.array(z.string()),

    /**
     * Additional sign-in claims
     */
    claims:z.record(z.string(),z.any()),
});
export const ConvoSignInJwtTransportSchema=ConvoSignInJwtValueSchema.extend({
    
    /**
     * Name of the database the JWT belongs
     */
    dbName:z.string(),
});

export const ConvoSignInJwtSchema=ConvoSignInJwtTransportSchema.extend({
    /**
     * Signed JWT containing containing identityPaths and any additional claims
     */
    jwt:z.string(),
});

export const ConvoEmailPasswordSignRequestSchema=z.object({
    email:z.string(),
    password:z.string(),
});

export const ConvoEmailOtpSignRequestSchema=z.object({
    email:z.string(),
    otp:z.string(),
});


