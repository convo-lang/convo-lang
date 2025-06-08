import { CancelToken } from "@iyio/common";
import { pathExistsAsync, readStdInLineAsync, spawnAsync } from "@iyio/node-common";
import { mkdir } from "fs/promises";
import { ConvoCliOptions } from "./convo-cli-types";

export const createNextAppAsync=async (options:ConvoCliOptions,cancel:CancelToken)=>{

    if(options.createAppWorkingDir && !await pathExistsAsync(options.createAppWorkingDir)){
        await mkdir(options.createAppWorkingDir,{recursive:true});
    }

    let dir=options.createAppDir;
    while(!dir && !cancel.isCanceled){
        console.log('Enter path where to create your app.');
        dir=await readStdInLineAsync();
    }

    if(cancel.isCanceled){
        return;
    }

    await spawnAsync({
        cwd:options.createAppWorkingDir,
        cmd:`npx --yes create-next-app --example https://github.com/convo-lang/convo-lang-nextjs-template '${dir}'`,
    })
}
