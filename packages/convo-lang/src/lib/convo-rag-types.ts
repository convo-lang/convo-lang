import type { Conversation } from "./Conversation.js";
import type { ConvoTokenUsage, FlatConvoConversation, FlatConvoMessage } from "./convo-types.js";

export type ConvoVectorValue=string|number[]|Uint8Array;

export interface ConvoDocumentReference
{
    content:string;
    sourceId?:string;
    sourceName?:string;
    sourceUrl?:string;
    contentType?:string;
    vector?:string|number[]|Uint8Array;
    path?:string;
}

export interface ConvoRagContext
{
    params:Record<string,any>;
    tolerance:number;
    lastMessage:FlatConvoMessage;
    flat:FlatConvoConversation;
    conversation:Conversation;
}

export type ConvoRagCallback=(
    ragContext:ConvoRagContext
)=>ConvoDocumentReference|null|(ConvoDocumentReference|null)[]|Promise<ConvoDocumentReference|null|(ConvoDocumentReference|null)[]>;

export interface ConvoRagSearch
{
    /**
     * The content to search against.
     */
    content?:string;
    tolerance:number;
    limit?:number;
    /**
     * If true the embeddings property of returned document should include their embeddings. In most
     * cases this is not needed and just added more overhead memory usage.
     */
    includeVector?:boolean;

    paths?:string[];
}

export interface ConvoRagSearchResultItem
{
    id?:string;
    distance?:number;
    document:ConvoDocumentReference;
}

export interface ConvoRagSearchResult
{
    items:ConvoRagSearchResultItem[];
    usage:ConvoTokenUsage;
}

export interface ConvoRagService
{
    /**
     * Searches to for matching document references
     */
    searchAsync(search:ConvoRagSearch):Promise<ConvoRagSearchResult>;

    /**
     * Upserts new documents in to the rag service.
     */
    upsertAsync?(documents:ConvoDocumentReference[]):Promise<void>;
}
