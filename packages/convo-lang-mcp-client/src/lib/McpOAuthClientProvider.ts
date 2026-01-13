import { InternalOptions } from "@iyio/common";
import { vfs } from "@iyio/vfs";
import { AddClientAuthentication, OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

export interface McpOAuthClientProviderOptions
{
    clientId?:string;
}

export const defaultMcpOAuthClientProviderClientId='__default';

interface McpOAuthClientProviderState{
    clientId:string;
}

export class McpOAuthClientProvider implements OAuthClientProvider
{

    private readonly options:InternalOptions<McpOAuthClientProviderOptions>;

    public constructor({
        clientId=defaultMcpOAuthClientProviderClientId,
    }:McpOAuthClientProviderOptions){
        this.options={
            clientId,
        }
    }

    get redirectUrl(): string | URL | undefined {
        console.log('hio 👋 👋 👋 redirectUrl',);
        return 'https://66f850fb7c51.ngrok.app/oauth-redirect';
    }
    clientMetadataUrl?: string | undefined;
    get clientMetadata(): { redirect_uris: string[]; token_endpoint_auth_method?: string | undefined; grant_types?: string[] | undefined; response_types?: string[] | undefined; client_name?: string | undefined; client_uri?: string | undefined; logo_uri?: string | undefined; scope?: string | undefined; contacts?: string[] | undefined; tos_uri?: string | undefined; policy_uri?: string | undefined; jwks_uri?: string | undefined; jwks?: any; software_id?: string | undefined; software_version?: string | undefined; software_statement?: string | undefined; } {
        console.log('hio 👋 👋 👋 clientMetadata()',);
        return {
            'redirect_uris':['https://66f850fb7c51.ngrok.app/oauth-redirect-2']
        }
    }
    private async saveValueAsync(name:string,value:any):Promise<void>{
        await vfs().writeObjectAsync(`/oauth/clients/${this.options.clientId}/${name}.json`,value);
    }
    private async loadValueAsync(name:string):Promise<any>{
        return await vfs().readObjectAsync(`/oauth/clients/${this.options.clientId}/${name}.json`);
    }

    state?(): string | Promise<string> {
        const state:McpOAuthClientProviderState={
            clientId:this.options.clientId,
        };
        console.log('hio 👋 👋 👋 state()',);
        return JSON.stringify(state);
    }
    async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
        console.log('hio 👋 👋 👋 clientInformation');
        return await this.loadValueAsync('clientInformation');
    }
    async saveClientInformation(clientInformation: OAuthClientInformationMixed):Promise<void>{
        console.log('hio 👋 👋 👋 Save client information',clientInformation);
        await this.saveValueAsync('clientInformation',clientInformation);
    }
    async tokens(): Promise<OAuthTokens | undefined> {
        console.log('hio 👋 👋 👋 tokens',);
        return await this.loadValueAsync('tokens');
    }
    async saveTokens(tokens: OAuthTokens): Promise<void> {
        console.log('hio 👋 👋 👋 saveTokens',tokens);
        await this.saveValueAsync('tokens',tokens);
    }
    redirectToAuthorization(authorizationUrl: URL): void | Promise<void> {
        console.log('hio 👋 👋 👋 redirectToAuthorization',authorizationUrl);
        if(globalThis.window){
            globalThis.window.open(authorizationUrl,'_blank');
        }else{

        }
    }
    async saveCodeVerifier(codeVerifier: string): Promise<void> {
        console.log('hio 👋 👋 👋 saveCodeVerifier',codeVerifier);
        await this.saveValueAsync('codeVerifier',codeVerifier);

    }
    async codeVerifier(): Promise<string> {
        console.log('hio 👋 👋 👋 codeVerifier',);
        return (await this.loadValueAsync('codeVerifier'))??'';
    }
    addClientAuthentication?: AddClientAuthentication | undefined;

    async validateResourceURL?(serverUrl: string | URL, resource?: string): Promise<URL | undefined> {
        console.log('hio 👋 👋 👋 validateResourceURL',{serverUrl,resource});
        return undefined;
    }
    invalidateCredentials?(scope: "all" | "client" | "tokens" | "verifier"): void | Promise<void> {
        console.log('hio 👋 👋 👋 invalidateCredentials',scope);
    }
    prepareTokenRequest?(scope?: string): URLSearchParams | Promise<URLSearchParams | undefined> | undefined {
       console.log('hio 👋 👋 👋 prepareTokenRequest',scope);
       return undefined
    }

}
