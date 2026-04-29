import type z from "zod";
import type { ConvoEmailOtpSignRequestSchema, ConvoEmailPasswordSignRequestSchema, ConvoSignInJwtSchema, ConvoSignInJwtTransportSchema, ConvoSignInJwtValueSchema } from "./convo-db-auth-schemas.js";

export type ConvoSignInJwt=z.infer<typeof ConvoSignInJwtSchema>;

export type ConvoSignInJwtValue=z.infer<typeof ConvoSignInJwtValueSchema>;

export type ConvoSignInJwtTransport=z.infer<typeof ConvoSignInJwtTransportSchema>;

export type ConvoEmailPasswordSignRequest=z.infer<typeof ConvoEmailPasswordSignRequestSchema>;

export type ConvoEmailOtpSignRequest=z.infer<typeof ConvoEmailOtpSignRequestSchema>;