import { convoImportService } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { McpImportService } from "./McpImportService.js";

export const convoMcpClientModule=(scope:ScopeRegistration)=>{
    console.log('hio 👋 👋 👋 INIT MCP',);
    scope.implementService(convoImportService,()=>new McpImportService());
}

