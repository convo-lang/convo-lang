import { ConvoCompletionMessage, convoControlResult, convoControlResultKeys, convoDescriptionToComment, convoLabeledScopeParamsToObj, ConvoMcpDescription, convoRoles, convoTags, escapeConvoMessageContent, escapeConvoTagValue, schemeToConvoArgsString } from "@convo-lang/convo-lang";
import { asArray, InternalOptions, joinPaths } from "@iyio/common";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ElicitationCompleteNotificationSchema, LoggingMessageNotificationSchema, ProgressNotificationSchema, PromptListChangedNotificationSchema, ResourceListChangedNotificationSchema, ResourceUpdatedNotificationSchema, TaskStatusNotificationSchema, ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { McpOAuthClientProvider } from "./McpOAuthClientProvider.js";

export interface McpClientInterfaceOptions
{
    url:string;
    name?:string;
}

interface ClientProxy
{
    client:Client;
    id:number;
    description:ConvoMcpDescription;
}

const nameFromUrl=(url:string)=>{
    const i=url.indexOf('://');
    return (i===-1?url:url.substring(i+3)).replace(/\W/g,'_');
}


/**
 * Represents the tools and resources of a single MCP server
 */
export class McpClientInterface
{
    private readonly options:InternalOptions<McpClientInterfaceOptions>;

    public constructor({
        url,
        name='',
    }:McpClientInterfaceOptions){
        this.options={
            url,
            name,
        }
    }

    public async getDescriptionAsync():Promise<ConvoMcpDescription>
    {
        const client=await this.getClientAsync();
        return client.description;
    }


    private nextClientId=1;
    private _client?:ClientProxy;
    private async getClientAsync():Promise<ClientProxy>
    {
        if(this._client){
            // todo - verify connected
            return this._client;
        }
        return this._client=await this.connectAsync();
    }

    private transportSessionId?:string;

    private async connectAsync():Promise<ClientProxy>
    {
        const id=++this.nextClientId;
        const client=new Client(
            {
                name:'convo-lang-client',
                version:'0.1.0'
            }
        );

        client.setNotificationHandler(PromptListChangedNotificationSchema,()=>{
            console.log(`mcp ${this.options.name}> prompt list change`);
        });

        client.setNotificationHandler(ToolListChangedNotificationSchema,()=>{
            console.log(`mcp ${this.options.name}> tool list change`);
        });

        client.setNotificationHandler(ResourceListChangedNotificationSchema,()=>{
            console.log(`mcp ${this.options.name}> resource list change`);
        });

        client.setNotificationHandler(ResourceUpdatedNotificationSchema,()=>{
            console.log(`mcp ${this.options.name}> resource update`);
        });

        client.setNotificationHandler(LoggingMessageNotificationSchema,(n)=>{
            console.log(`mcp (${n.params.level}) ${this.options.name}> `,n.params.data);
        });

        client.setNotificationHandler(ElicitationCompleteNotificationSchema,()=>{
            console.log(`mcp ${this.options.name}> elicitation change`);
        });

        client.setNotificationHandler(ProgressNotificationSchema,n=>{
            console.log(`mcp ${this.options.name}> progress:${n.params.progress}/${n.params.total??'?'}`);
        });

        client.setNotificationHandler(TaskStatusNotificationSchema,n=>{
            console.log(`mcp ${this.options.name}> task status`,n.params);
        });

        const authProvider=new McpOAuthClientProvider({});
        const transport=new StreamableHTTPClientTransport(new URL(this.options.url),{
            sessionId:this.transportSessionId,
            authProvider,
        });
        setTimeout(()=>{
            transport.finishAuth('RmI0squ549UTkOcKeo_YiJutunScW5I8GP-PYOCF7Sw')
        },3000);
        console.log('hio 👋 👋 👋 before connect',);
        await client.connect(transport);
        console.log('hio 👋 👋 👋 connected',);
        this.transportSessionId=transport.sessionId;

        const proxy:ClientProxy={client,id,description:{
            name:this.options.name,
            description:client.getInstructions()??'',
            tools:[],
            resources:[],
            prompts:[],
            promptTemplates:[],
        }};

        await Promise.all([
            this.updateToolsAsync(client,proxy.description),
            // this.updateResourcesAsync(client,proxy.description),
            // this.updatePromptsAsync(client,proxy.description),
            // this.updatePromptTemplatesAsync(client,proxy.description),
        ]);

        return proxy;
    }

    private getFullPath(localName:string):string{
        if(this.options.name){
            return joinPaths('/'+this.options.name,localName);
        }else{
            return localName;
        }
    }

    private getIdentifier(localName:string):string{
        const path=this.getFullPath(localName);
        const name=path.replace(/\W/g,'_');
        return name.startsWith('_')?name.substring(1):name;
    }

    private async updateToolsAsync(client:Client,description:ConvoMcpDescription){
        console.log('hio 👋 👋 👋 list tools',);
        const tools=await client.listTools();
        console.log('hio 👋 👋 👋 tools listed',);
        for(const t of tools.tools){
            const localPath=`/tools/${t.name}`;
            const functionName=this.getIdentifier(t.name);
            console.log('hio 👋 👋 👋 ARGS',schemeToConvoArgsString(t.inputSchema,true));
            description.tools.push({
                type:'tool',
                fullPath:this.getFullPath(localPath),
                localPath,
                functionName,
                convo:(
                    (t.description?`${convoDescriptionToComment(t.description)}\n`:'')+
                    `@${convoTags.fromMcp}${this.options.name?' '+escapeConvoTagValue(this.options.name):''}\n`+
                    `> extern ${functionName}(${schemeToConvoArgsString(t.inputSchema,true)})`
                ),
                callAsync:async (scope)=>{
                    console.log('hio 👋 👋 👋 call scope',scope);
                    const params=convoLabeledScopeParamsToObj(scope);
                    console.log(`hio 👋 👋 👋 call ${t.name}`,params);
                    const r=await client.callTool({
                        name:t.name,
                        arguments:params,
                    });

                    console.log('hio 👋 👋 👋 tool call result',r);

                    if(r.content){
                        const srcMessages=asArray(r.content) as {
                            type:'text'|'image'|'audio'|'resource_link',
                            role?:string;
                            text?:string;
                            data?:string;
                            mimeType?:string;
                            uri?:string;
                            description?:string;
                        }[];
                        const tags={[convoTags.fromMcp]:this.options.name};
                        const messages=srcMessages.map<ConvoCompletionMessage|undefined>(m=>{
                            if(m.data){
                                return {
                                    tags,
                                    role:m.role??convoRoles.assistant,
                                    content:`![${
                                        m.type==='image'?'':`!${m.mimeType??m.type}::`
                                    }${
                                        m.text?escapeConvoTagValue(m.text).replace(/[\[\]]/g,'_'):'image'
                                    }](${
                                        m.data
                                    })`
                                }
                            }else if(m.text){
                                return {
                                    tags,
                                    role:m.role??convoRoles.assistant,
                                    content:m.text,
                                }
                            }else if(m.type==='resource_link'){
                                return {
                                    tags:{
                                        ...tags,
                                        [convoTags.mcpResourceList]:'',
                                    },
                                    role:m.role??convoRoles.assistant,
                                    content:`[${
                                        escapeConvoTagValue(m.description??'resource').replace(/[\[\]]/g,'_')
                                    }](${
                                        escapeConvoMessageContent(m.uri)
                                    })`
                                }
                            }else{
                                return undefined;
                            }
                        }).filter(v=>v);
                        let lastResourceMsg:ConvoCompletionMessage|undefined;
                        for(let i=0;i<messages.length;i++){
                            const msg=messages[i];
                            if(!msg){
                                continue;
                            }
                            if(msg.tags?.[convoTags.mcpResourceList]!==undefined){
                                if(lastResourceMsg){
                                    if(!lastResourceMsg.content?.startsWith('-')){
                                        lastResourceMsg.content='- '+lastResourceMsg.content;
                                    }
                                    lastResourceMsg.content+='\n- '+msg.content;
                                    messages.splice(i,1);
                                    i--;
                                }else{
                                    lastResourceMsg=msg;
                                }
                            }else{
                                lastResourceMsg=undefined;
                            }
                        }
                        return {
                            [convoControlResult]:true,
                            [convoControlResultKeys.source]:r,
                            [convoControlResultKeys.messages]:messages,
                        }
                    }

                    return r.toolResult??r.structuredContent;
                }
            })
        }
        console.log('hio 👋 👋 👋 tools',tools);
    }

    private async updateResourcesAsync(client:Client,description:ConvoMcpDescription){
        // todo
    }

    private async updatePromptsAsync(client:Client,description:ConvoMcpDescription){
        // todo
    }

    private async updatePromptTemplatesAsync(client:Client,description:ConvoMcpDescription){
        // todo
    }
}
