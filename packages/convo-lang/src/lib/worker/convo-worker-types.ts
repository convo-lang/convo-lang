import { ConvoMessage } from "../convo-types.js";

export type ConvoWorkerStage='init'|'load'|'parse'|'check-io'|'run-convo'|'write-output'

export type ConvoWorkerState=(
    {
        loaded?:undefined;
    }
|
    {
        loaded:false;
        error:string;
    }
|
    (
        {
            loaded:true;
            source:string;
        }
    &
        (
            {
                parsed?:undefined
            }
        |
            {
                parsed:false;
                error:string;
            }
        |
            (
                {
                    parsed:true;
                    messages:ConvoMessage[];
                    inputs:string[];
                    outputs:string[];
                }
            &
                (
                    {
                        ioChecked?:undefined;
                    }
                |
                    {
                        ioChecked:false;
                        error:string;
                    }
                |
                    {
                        ioChecked:true;
                    }
                )
            )
        )
    )
)


