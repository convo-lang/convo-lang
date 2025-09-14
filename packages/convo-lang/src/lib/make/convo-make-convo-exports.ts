import { convoFunctions } from "../convo-lib.js";
import { ConvoModule } from "../convo-types.js";
import { convoDefineMakeAppScopeFunction, convoDefineMakeStageScopeFunction, convoMakeScopeFunction, convoMakeTargetScopeFunction } from "./convo-make-scope-functions.js";

export const convoMakeExports=(name:string):ConvoModule|undefined=>{
    switch(name){

        case 'make.convo':
            return {
                name:name,
                uri:name,
                externScopeFunctions:{
                    [convoFunctions.makeDefaults]:convoMakeScopeFunction,
                    [convoFunctions.makeTarget]:convoMakeTargetScopeFunction,
                    [convoFunctions.makeApp]:convoDefineMakeAppScopeFunction,
                    [convoFunctions.makeStage]:convoDefineMakeStageScopeFunction,
                },
                convo:/*convo*/`

@assumeHandledMessageLocation
@messageHandler make
> makeHandler(defaults:any) -> (
    default.instructions=switch(default._.length default._ undefined)
    default._=undefined
    makeDefaults(defaults);
)

@assumeHandledMessageLocation
@messageHandler target
> targetHandler(target:any) -> (
    target.instructions=switch(target._.length target._ undefined)
    target._=undefined
    target.stage=or(target.stage __currentMakeStage)
    makeTarget(target);
)

@assumeHandledMessageLocation
@messageHandler stage
> stageHandler(stage:any) -> (
    stage.instructions=switch(stage._.length stage._ undefined)
    stage._=undefined
    @shared
    __currentMakeStage=or(stage.name "default")
    makeStage(stage)
)

@assumeHandledMessageLocation
@messageHandler app
> appHandler(app:any) -> (
    app._=undefined
    makeApp(app)
)

                `.trim(),
            }


        default: return undefined;

    }
}
