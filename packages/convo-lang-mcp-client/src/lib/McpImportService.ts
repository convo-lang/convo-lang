import { ConvoImport, ConvoImportService, ConvoImportTest, ConvoModule } from "@convo-lang/convo-lang";
import { AnyFunction } from "@iyio/common";
import { McpClientCtrl } from "./McpClientCtrl.js";
export class McpImportService implements ConvoImportService
{

    private readonly ctrl:McpClientCtrl=new McpClientCtrl();

    public readonly priority=100;

    public async handleImport(_import:ConvoImport):Promise<ConvoModule|ConvoModule[]|null|undefined>
    {
        const path=_import.targetPath??_import.name;

        console.log('hio 👋 👋 👋 MCP import',_import);
        const client=this.ctrl.getClient({
            url:path,
            name:_import.modifierMap['mcp'],
        });

        const description=await client.getDescriptionAsync();

        console.log('hio 👋 👋 👋 MCP Description',description);

        const convo=[
            description.tools.filter(t=>t.convo).map(t=>t.convo),
        ].join('\n\n');

        const externScopeFunctions:Record<string,AnyFunction>={};

        for(const tool of description.tools){
            externScopeFunctions[tool.functionName]=tool.callAsync;
        }

        return {
            name:_import.name,
            convo,
            filePath:path,
            externScopeFunctions
        }
    }

    public canImport(path:string,importTest:ConvoImportTest):boolean
    {
        console.log('hio 👋 👋 👋 CAN TEST',importTest);
        return importTest.modifierMap['mcp']!==undefined;
    }
}
