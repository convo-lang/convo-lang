import { Conversation, ConversationOptions, convoAnyModelName } from '@convo-lang/convo-lang';
import { InternalOptions, ReadonlySubject, createJsonRefReplacer, getErrorMessage, pushBehaviorSubjectAry } from '@iyio/common';
import { parseJson5 } from '@iyio/json5';
import { BehaviorSubject } from 'rxjs';
import { ConvoModelTestManager } from './ConvoModelTestManager';
import { ConvoModelTestResult } from './convo-testing-types';

export interface ConvoModelTesterOptions
{
    model:string;
    skipDefineModel?:boolean;
    initConvo?:string;
    convoOptions?:ConversationOptions;
    manager?:ConvoModelTestManager;
    tests?:string[];
}

export class ConvoModelTester
{

    private readonly _testResults:BehaviorSubject<ConvoModelTestResult[]>=new BehaviorSubject<ConvoModelTestResult[]>([]);
    public get testResultsSubject():ReadonlySubject<ConvoModelTestResult[]>{return this._testResults}
    public get testResults(){return this._testResults.value}

    private readonly options:InternalOptions<ConvoModelTesterOptions,'initConvo'|'manager'|'tests'>;

    public constructor({
        initConvo,
        convoOptions={},
        model,
        skipDefineModel=false,
        manager,
        tests,
    }:ConvoModelTesterOptions){
        this.options={
            initConvo,
            convoOptions,
            model,
            skipDefineModel,
            manager,
            tests,
        }
    }


    public async runAllTestsAsync()
    {
        for(const name of this.getTestNames()){
            await (this as any)['test_'+name]();
        }
    }

    public getTestNames():string[]{
        const names:string[]=[];
        for(const e in this){
            if(e.startsWith('test_')){
                names.push(e.substring(5))
            }
        }
        if(this.options.tests){
            return names.filter(t=>this.options.tests?.includes(t))
        }else{
            return names;
        }
    }

    private readonly createDebugger=(output:string[])=>(...values:any[])=>{
        for(const v of values){
            try{
                const type=typeof v;
                if(type === 'string'){
                    output.push(v);
                }else if(type==='object'){
                    try{
                        output.push(JSON.stringify(v,null,4))
                    }catch{
                        try{
                            output.push(JSON.stringify(v,createJsonRefReplacer(),4))
                        }catch{
                            output.push(v+'');
                        }
                    }
                }else{
                    output.push(v+'');
                }
            }catch{
                output.push('!! Unable to push debug output');
            }
        }
    }

    private createConvo(debug:(...values:any[])=>void,convoOptions?:ConversationOptions):Conversation
    {
        const convo=new Conversation({
            disableAutoFlatten:true,
            debug,
            ...this.options.convoOptions,
            ...convoOptions
        });

        if(!this.options.skipDefineModel && this.options.model!==convoAnyModelName){
            convo.append(`> define\n__model=${JSON.stringify(this.options.model)}`);
        }

        convo.append(`> define\n__debug=true\n__trackModel=true`);

        if(this.options.initConvo){
            convo.append(this.options.initConvo);
        }

        return convo;
    }

    private async runTestAsync({
        name,
        expectedRoles,
        returnCount,
        format,
        isJsonArray,
        disablePublishResult,
        callFunction,
        functionCall=callFunction?true:false,
        returnValue,
        convoOptions,
    }:TestOptions,source:string):Promise<ConvoModelTestResult>{
        const debugOutput:string[]=[];
        const log=this.createDebugger(debugOutput)
        log(`## test start ${this.options.model}:${name}`);
        const convo=this.createConvo(log,convoOptions);
        const startTime=Date.now();
        try{
            convo.append(source);
            const r=await convo.completeAsync();

            const last=r.message;

            if(expectedRoles){
                for(let i=0;i<expectedRoles.length;i++){
                    const role=expectedRoles[i];
                    const msg=r.messages[i];
                    if(!msg){
                        throw new Error(`Returned result does not have a message at index ${i} for checking role`);
                    }
                    if(role===null || role===undefined){
                        continue;
                    }
                    if(msg.role!==role){
                        throw new Error(`Expected returned message at index (${i}) to have a role of ${msg.role}`);
                    }
                }
                if(expectedRoles.length>r.messages.length){
                    throw new Error(`Expected returned messages has more messages that expected roles`);
                }
            }

            if(returnCount!==undefined && returnCount!==r.messages.length){
                throw new Error(`Expected (${returnCount}) returned messages but found (${r.messages.length})`)
            }

            if(format && last?.format!==format){
                throw new Error(`Expected returned message to have a format of (${format})`);
            }

            if(format===null && last?.format){
                throw new Error('Expected returned message to not have a format');
            }

            const jsonValue=last?.format==='json'?parseJson5(last.content??''):undefined;

            if(isJsonArray && !Array.isArray(jsonValue)){
                throw new Error(`Expected JSON array`);
            }
            if(callFunction && r.lastFnCall?.name!==callFunction){
                throw new Error(`Expected (${callFunction}) function to be called`)
            }

            if(functionCall && !r.lastFnCall){
                throw new Error(`Expected function to be called`)
            }

            if(returnValue!==undefined && returnValue!==r.lastFnCall?.returnValue){
                throw new Error(`Expected return value was not returned.\nExpected:${
                    JSON.stringify(returnValue)
                }\nReturned:${JSON.stringify(r.lastFnCall?.returnValue)}`);
            }


            const endConvo=convo.convo;
            log(`## test pass ${this.options.model}:${name}`);
            const result:ConvoModelTestResult={
                model:this.options.model,
                testName:name,
                convo:endConvo,
                passed:true,
                debugOutput,
                durationMs:Date.now()-startTime,
            }
            if(!disablePublishResult){
                this.publishResult(result);
            }
            return result;

        }catch(ex){

            const endConvo=convo.convo;
            log(`## test failed ${this.options.model}:${name}`);
            const errorMessage=getErrorMessage(ex);
            const result:ConvoModelTestResult={
                model:this.options.model,
                testName:name,
                convo:endConvo,
                passed:false,
                errorMessage,
                errorStack:(ex as any)?.stack,
                debugOutput,
                durationMs:Date.now()-startTime,
            }
            if(!disablePublishResult){
                this.publishResult(result);
            }
            return result;
        }
    }

    private publishResult(result:ConvoModelTestResult){
        pushBehaviorSubjectAry(this._testResults,result);
        this.options.manager?.publishResult(result);
    }

    public test_sayHi=()=>
    {
        return this.runTestAsync({
            name:'sayHi',
            description:'Test to see if a simple message of hi completes',
            format:null,
            expectedRoles:['assistant']
        },/*convo*/`

> user
hi

        `)
    }

    public test_jsonArray=()=>
    {
        return this.runTestAsync({
            name:'jsonArray',
            description:'Test JSON mode for returning an array',
            format:'json',
            isJsonArray:true,
        },/*convo*/`

> define
Planet=struct(
    name: string
    # Distance from sun in miles
    distanceFromSun: number;
)

@json Planet[]
> user
List the planets in our solar system

        `)
    }

    public test_callAddNumbers=()=>
    {
        return this.runTestAsync({
            name:'callAddNumbers',
            description:'Calls a functions to add numbers',
            callFunction:'addNumbers',
            returnValue:19,
        },/*convo*/`

> addNumbers(
    a:number
    b:number
) -> (
    return(add(a b))
)


> user
Add 7 plus 12 by calling the addNumbers function

        `)
    }

    public test_assistantFirst=()=>
    {
        return this.runTestAsync({
            name:'assistantFirst',
            description:'Starts a conversation with an assistant message first',
        },/*convo*/`

> assistant
How can I help you?

> user
What color is the sky on a sunny day?

        `)
    }

}

interface TestOptions{
    name:string;
    description:string;
    format?:string|null;
    expectedRoles?:(string|null|undefined)[];
    convoOptions?:ConversationOptions;
    returnCount?:number;
    isJsonArray?:boolean;
    disablePublishResult?:boolean;
    functionCall?:boolean;
    callFunction?:string;
    returnValue?:any;
}
