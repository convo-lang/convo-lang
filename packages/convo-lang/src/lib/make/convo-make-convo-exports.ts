import { convoFunctions } from "../convo-lib";
import { ConvoModule } from "../convo-types";
import { convoDefineMakeAppScopeFunction, convoDefineMakeStageScopeFunction, convoMakeScopeFunction, convoMakeTargetScopeFunction } from "./convo-make-scope-functions";

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
    @shared
    __currentMakeStage=or(stage.name "default")
    makeStage(stage)
)

@assumeHandledMessageLocation
@messageHandler app
> appHandler(app:any) -> (
    makeApp(app)
)

                `.trim(),
            }


        default: return undefined;

    }
}
