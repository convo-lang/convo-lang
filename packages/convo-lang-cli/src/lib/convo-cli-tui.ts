import { parseJson5 } from "@iyio/json5"
import { pathExistsAsync } from "@iyio/node-common"
import { readFile } from "node:fs/promises"
import { defaultConvoCliConfigFile } from "./convo-cli-lib"
import { ConvoCliConfig } from "./convo-cli-types"

export const runConvoCliTuiAsync=async ()=>{

    let config:ConvoCliConfig;

    const state:State={}
    
    if(await pathExistsAsync(defaultConvoCliConfigFile)){
        try{
            config=parseJson5((await readFile(defaultConvoCliConfigFile)).toString());
            state.loadedConfig=defaultConvoCliConfigFile;
        }catch(ex){
            console.error('Failed to load existing global config. Change made will overwrite the existing file',ex);
            config={}
        }
    }else{
        config={}
    }

    // todo - use @convo-lang/tui to render TUI

    



}

interface State
{
    loadedConfig?:string;
}
