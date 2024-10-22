import { Scope, ScopeRegistration, aryRandomize, defineStringParam, httpClient, joinPaths } from "@iyio/common";
import { getSerializableFlatConvoConversation, passthroughConvoInputType, passthroughConvoOutputType } from "./convo-lib";
import { ConvoCompletionMessage, ConvoCompletionService, ConvoModelInfo, FlatConvoConversationBase } from "./convo-types";
import { convoCompletionService } from "./convo.deps";

export const defaultConvoHttpEndpointPrefix='/convo-lang';
export const defaultConvoHttpApiEndpointPrefix='/api'+defaultConvoHttpEndpointPrefix;

export const httpConvoCompletionEndpointParam=defineStringParam('httpConvoCompletionEndpoint',defaultConvoHttpApiEndpointPrefix);

export const convoHttpRelayModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoCompletionService,scope=>HttpConvoCompletionService.fromScope(scope));
}

export interface HttpConvoCompletionServiceOptions
{
    /**
     * Endpoint to relay messages to. If an array is provided load balancing will be preformed
     * by evenly distributing request between each URL.
     */
    endpoint:string|string[];
}

/**
 * Forwards messages to an convo-lang api endpoint or pool of convo-lang api endpoints.
 *
 * ## Endpoint structure
 *
 * ### POST /completion (flat:FlatConvoConversationBase) => ConvoCompletionMessage[]
 * Completes a posted flat conversation and returns the completed messages.
 *
 * ### POST /convo (convo:string) => string
 * Completes a convo conversation as a string and returns the completed messages as a string
 *
 * ### GET /models ()=>ConvoModelInfo[]
 * Returns all models known to the server
 */
export class HttpConvoCompletionService implements ConvoCompletionService<FlatConvoConversationBase,ConvoCompletionMessage[]>
{

    public static fromScope(scope:Scope){
        const ep=httpConvoCompletionEndpointParam().split(',').map(e=>e.trim()).filter(e=>e);
        const endpoint=ep.length===1?ep[0]:ep;
        if(!endpoint){
            throw new Error('Empty HttpConvoCompletionService provided');
        }
        return new HttpConvoCompletionService({
            endpoint
        })
    }

    public readonly inputType=passthroughConvoInputType;

    public readonly outputType=passthroughConvoOutputType;

    private readonly endpoint:string|string[];

    public constructor({
        endpoint
    }:HttpConvoCompletionServiceOptions){
        if(Array.isArray(endpoint)){
            endpoint=[...endpoint];
            aryRandomize(endpoint);
        }
        this.endpoint=endpoint;
    }

    public canComplete(model:string|undefined,flat:FlatConvoConversationBase):boolean
    {
        return true;
    }

    private endpointIndex=0;
    private getEndpoint(){
        if(Array.isArray(this.endpoint)){
            const e=this.endpoint[this.endpointIndex];

            this.endpointIndex++;
            if(this.endpointIndex>=this.endpoint.length){
                this.endpointIndex=0;
                aryRandomize(this.endpoint);
            }

            return e??'';
        }else{
            return this.endpoint;
        }
    }

    public async completeConvoAsync(flat:FlatConvoConversationBase):Promise<ConvoCompletionMessage[]>
    {
        const r=await httpClient().postAsync<ConvoCompletionMessage[]>(
            joinPaths(this.getEndpoint(),'/completion'),
            getSerializableFlatConvoConversation(flat)
        );
        if(!r){
            throw new Error('convo-lang ai endpoint returned empty response');
        }
        return r;
    }

    public getModelsAsync():Promise<ConvoModelInfo[]|undefined>
    {
        return httpClient().getAsync<ConvoModelInfo[]>(joinPaths(this.getEndpoint(),'/models'));
    }
}
