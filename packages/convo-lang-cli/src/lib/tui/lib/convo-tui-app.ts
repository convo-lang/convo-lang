import { Studio, TmpStudioIo } from "@convo-lang/studio/convo-studio-types.js"
import { StudioCtrl } from "@convo-lang/studio/StudioCtrl"
import { ConvoTuiCtrl } from "@convo-lang/tui/ConvoTuiCtrl"
import type { TuiConsole } from "@convo-lang/tui/tui-types.js"
import { CancelToken, getErrorMessage } from "@iyio/common"
import { readFile, writeFile } from "fs/promises"
import { convoTuiTheme } from "../lib/convo-tui-theme.js"
import { apiScreen } from "../screens/api-screen.js"
import { dbScreen } from "../screens/db-screen.js"
import { fileEditorScreen } from "../screens/file-editor-screen.js"
import { settingsScreen } from "../screens/settings-screen.js"
import { ConvoCliTuiCtx } from "./convo-cli-tui-types.js"
import { tuiFileLogger } from "./tui-file-logger.js"

export const getConvoTuiScreens=(ctx:ConvoCliTuiCtx)=>{

    return [
        fileEditorScreen(ctx),
        dbScreen(ctx),
        apiScreen(ctx),
        settingsScreen(ctx),
    ]
}

const tmpIo:TmpStudioIo={
    async readFileAsync(path:string){
        try{
            return (await readFile(path)).toString();
        }catch(ex){
            console.error(`Failed to read file: ${path}`,ex);
            return undefined;
        }
    },
    async writeFileAsync(path:string,content:string){
        try{
            await writeFile(path,content);
            return true;
        }catch(ex){
            console.error(`Failed to write file: ${path}`,ex);
            return false;
        }
    },
}

export interface RunConvoTuiOptions
{
    studio?:Studio;
    windowId?:string;
}

export const runConvoTuiAsync=async (options:RunConvoTuiOptions,cancel:CancelToken)=>{
        
    const tuiConsole:TuiConsole={
        stdout:process.stdout as TuiConsole['stdout'],
        stdin:process.stdin as TuiConsole['stdin'],
    };

    const studio=new StudioCtrl({
        workspacePath:process.cwd(),
        tmpIo,
        studio:options.studio,
    });

    const ctrl=new ConvoTuiCtrl({
        console:tuiConsole,
        theme:convoTuiTheme,
        defaultScreen:'home',
        log:tuiFileLogger,
        screens:tui=>{
            interceptConsole(tui);
            return getConvoTuiScreens({tui,studio,window:studio.getWorkingWindowOrById(options.windowId)});
        }
    });
    
    ctrl.init();

    cancel.removeListener(()=>ctrl.dispose());

    await ctrl.runPromise;
}

let intercepted=false;
const interceptConsole=(ctrl:ConvoTuiCtrl)=>{
    if(intercepted){
        return;
    }
    intercepted=false;
    try{
        console.log=console.error=(...args)=>{
            const output:string[]=[];
            for(const v of args){
                try{
                    if(typeof v === 'string'){
                        output.push(v+' ');
                    }else if(v instanceof Error){
                        output.push(getErrorMessage(v));
                    }else{
                        output.push(JSON.stringify(v,null,4)+' ');
                    }
                }catch(ex){
                    output.push(v+' ');
                }
            }
            output.push('\n');
            ctrl.log(output.join(''))
        };
    }catch{}
}