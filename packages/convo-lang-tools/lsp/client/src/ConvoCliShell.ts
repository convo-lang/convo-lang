import { ConvoMakeShell, ConvoMakeShellExecOptions, ConvoMakeShellProc } from "@convo-lang/convo-lang-make";
import { createPromiseSource } from "@iyio/common";
import { spawnAsync } from "@iyio/node-common";
import { createServer } from "node:net";
import { Subject } from "rxjs";

export class ConvoCliShell implements ConvoMakeShell
{
    public exec(shellCommand:string,options?:ConvoMakeShellExecOptions):ConvoMakeShellProc
    {
        const exitProcess=createPromiseSource<number>();
        const onOutput=new Subject<string>();
        const onErr=new Subject<string>();

        spawnAsync({
            cmd:shellCommand,
            cwd:options?.cwd,
            onOutput:(type,value)=>{
                if(type==='out'){
                    onOutput.next(value);
                }else{
                    onErr.next(value);
                }
            },
            onExit(code){
                exitProcess.resolve(code)
            },
        }).catch(ex=>{
            console.error('exec failed',ex)
        })

        const proc:ConvoMakeShellProc={
            dispose(){

            },
            onOutput,
            onErr,
            exitPromise:exitProcess.promise,
        }

        return proc;
    }


    public isPortOpenAsync(port:number):Promise<boolean>
    {
        return new Promise<boolean>((resolve,reject)=>{

            try{
                const server=createServer();
                const close=()=>{
                    try{
                        server.close();
                    }catch{
                        //
                    }
                }

                server.once('error',()=>{
                    close();
                    resolve(false);
                });

                server.once('listening',()=>{
                    close();
                    resolve(true);
                });

                server.listen(port);

            }catch{
                resolve(false);
            }
        })
    }
}
