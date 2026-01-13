import { McpClientInterface, McpClientInterfaceOptions } from "./McpClientInterface.js";

/**
 * Manages connections and interfaces to MCP servers
 */
export class McpClientCtrl
{

    private readonly clients:Record<string,McpClientInterface>={}

    public getClient(options:McpClientInterfaceOptions):McpClientInterface{
        const url=options.url;
        return this.clients[url]??(this.clients[url]=new McpClientInterface(options));
    }
}
