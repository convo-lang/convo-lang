import { uuid, zodTypeToJsonScheme } from "@iyio/common"
import { parseJson5 } from "@iyio/json5"
import { Conversation } from "./Conversation"
import { ConvoError } from "./ConvoError"
import { convoAnyModelName, convoTags, createFunctionCallConvoCompletionMessage, createTextConvoCompletionMessage, getLastConvoMessageWithRole, insertSystemMessageIntoFlatConvo, isConvoModelAliasMatch, parseConvoJsonMessage } from "./convo-lib"
import { ConvoCompletionMessage, ConvoCompletionService, ConvoCompletionServiceAndModel, ConvoConversationConverter, ConvoConversion, ConvoModelInfo, FlatConvoConversation, FlatConvoMessage, SimulatedConvoFunctionCall } from "./convo-types"
import { convoTypeToJsonScheme } from "./convo-zod"

export const convertConvoInput=(
    flat:FlatConvoConversation,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[]
):ConvoConversion<any>=>{
    for(const converter of converters){
        if(converter.supportedInputTypes.includes(inputType)){
            return {
                success:true,
                converter,
                result:converter.convertConvoToInput(flat,inputType),
            }
        }
    }
    return {
        success:false
    }
}

export const convertConvoOutput=(
    output:any,
    outputType:string,
    input:any,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[],
    flat:FlatConvoConversation
):ConvoConversion<any>=>{
    for(const converter of converters){
        if(converter.supportedOutputTypes.includes(outputType)){
            return {
                success:true,
                converter,
                result:converter.convertOutputToConvo(output,outputType,input,inputType,flat),
            }
        }
    }
    return {
        success:false
    }
}

export const requireConvertConvoInput=(
    flat:FlatConvoConversation,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[]
):any=>{
    const r=convertConvoInput(flat,inputType,converters);
    if(!r.success){
        throw new Error(`No convo converter found for input type - ${inputType}`);
    }
    return r.result;
}

export const requireConvertConvoOutput=(
    output:any,
    outputType:string,
    input:any,
    inputType:string,
    converters:ConvoConversationConverter<any,any>[],
    flat:FlatConvoConversation
):ConvoCompletionMessage[]=>{
    const r=convertConvoOutput(output,outputType,input,inputType,converters,flat);
    if(!r.success){
        throw new Error(`No convo converter found for output type - ${outputType}`);
    }
    return r.result;
}

export const completeConvoUsingCompletionServiceAsync=async (
    flat:FlatConvoConversation,
    service:ConvoCompletionService<any,any>|null|undefined,
    converters:ConvoConversationConverter<any,any>[]
):Promise<ConvoCompletionMessage[]>=>{
    if(!service){
        return [];
    }
    const input=requireConvertConvoInput(flat,service.inputType,converters);
    const r=await service.completeConvoAsync(input,flat);
    return requireConvertConvoOutput(r,service.outputType,input,service.inputType,converters,flat);

}

export const getConvoCompletionServiceAsync=async (
    flat:FlatConvoConversation,
    services:ConvoCompletionService<any,any>[],
    updateTargetModel=false,
    cache?:Record<string,ConvoCompletionServiceAndModel[]>
):Promise<ConvoCompletionServiceAndModel|undefined>=>{
    const serviceModels=await getConvoCompletionServicesForModelAsync(flat.responseModel??convoAnyModelName,services,cache);
    for(const s of serviceModels){
        if(s.service?.canComplete(s.model?.name??flat.responseModel??convoAnyModelName,flat)){
            if(updateTargetModel && s.model){
                flat.responseModel=s.model.name;
                flat.model=s.model;
            }
            return s;
        }
    }
    return undefined;
}

export const getConvoCompletionServicesForModelAsync=async (
    model:string,
    services:ConvoCompletionService<any,any>[],
    cache?:Record<string,ConvoCompletionServiceAndModel[]>
):Promise<ConvoCompletionServiceAndModel[]>=>{

    const cached=cache?.[model];
    if(cached){
        return cached;
    }

    const matches:{priority:number,service:ConvoCompletionServiceAndModel}[]=[];
    for(const s of services){
        const models=await s.getModelsAsync?.();
        if(!models){
            matches.push({priority:Number.MIN_SAFE_INTEGER,service:{service:s}});
            continue;
        }
        let hasMatch=false;
        for(const m of models){
            if(m.name===model){
                matches.push({priority:m.priority??0,service:{service:s,model:m}});
                hasMatch=true;
            }
            if(m.aliases){
                for(const a of m.aliases){
                    if(isConvoModelAliasMatch(model,a)){
                        matches.push({priority:a.priority??0,service:{service:s,model:m}});
                        hasMatch=true;
                    }
                }
            }
        }
        if(!hasMatch){
            const m=models.find(m=>m.isServiceDefault);
            if(m){
                matches.push({priority:Number.MIN_SAFE_INTEGER,service:{service:s,model:m}});
            }
        }
    }
    matches.sort((a,b)=>b.priority-a.priority);
    const service=matches.map(m=>m.service);
    if(cache){
        cache[model]=service;
    }
    return service;
}

export interface ConvoModelConfigurationToInputResult
{
    jsonMode:boolean;
    lastMsg?:FlatConvoMessage;
    hasFunctions:boolean;
}

export const applyConvoModelConfigurationToInputAsync=async (
    model:ConvoModelInfo,
    flat:FlatConvoConversation,
    convo:Conversation
):Promise<ConvoModelConfigurationToInputResult>=>{

    const lastMsg=getLastConvoMessageWithRole(flat.messages,'user');
    const jsonMode=lastMsg?.responseFormat==='json';
    let hasFunctions=false;
    let fnSystem:string[]|undefined;

    // first role requirement
    const roleRequireAry=model.requiredFirstMessageRole?(model.requiredFirstMessageRoleList??['user','assistant']):undefined;
    let firstRequiredRoleChecked=roleRequireAry===undefined;

    for(let i=0;i<flat.messages.length;i++){
        const msg=flat.messages[i];
        if(!msg){
            continue;
        }
        if( jsonMode &&
            (model.jsonModeDisableFunctions || model.jsonModeImplementAsFunction) &&
            msg?.fn &&
            !msg.called
        ){
            flat.messages.splice(i,1);
            i--;
            continue;
        }
        if(msg.responseFormat==='json'){
            applyJsonModeToMessage(msg,model,flat);
        }
        if(msg.fn && !msg.called){
            hasFunctions=true;
        }
        if(!model.supportsFunctionCalling){
            if(msg.fn && !msg.called){
                if(!fnSystem){
                    fnSystem=[];
                }
                fnSystem.push(`<function>\nName: ${
                    msg.fn.name
                }\nDescription: ${
                    msg.fn.description??''
                }\nParameters JSON Scheme: ${
                    JSON.stringify((msg._fnParams??(msg.fnParams?(zodTypeToJsonScheme(msg.fnParams)??{}):{})))
                }\n</function>\n`);
                flat.messages.splice(i,1);
                i--;
            }else if(msg.called){
                const updated={...msg};
                flat.messages[i]=updated;
                delete updated.called;
                updated.role='assistant';
                const fnCall:SimulatedConvoFunctionCall={
                    functionName:msg.called.name,
                    parameters:msg.calledParams??{}
                }
                updated.content=JSON.stringify(fnCall,null,4);

                const resultMsg:FlatConvoMessage={
                    role:'user',
                    content:(
                        `The return value of calling ${msg.called.name} is:\`\`\` json\n${
                            msg.calledReturn===undefined?'undefined':JSON.stringify(msg.calledReturn,null,4)
                        }\n\`\`\``
                    )
                }

                flat.messages.splice(i+1,0,resultMsg);

            }
        }

        if(!firstRequiredRoleChecked && roleRequireAry?.includes(msg.role)){
            firstRequiredRoleChecked=true;
            if(msg.role!==model.requiredFirstMessageRole){
                const msg:FlatConvoMessage={
                    role:model.requiredFirstMessageRole??'user',
                    content:model.requiredFirstMessageRoleContent??'You can start the conversation',
                    tags:{[convoTags.hidden]:''}
                }
                if(convo.isUserMessage(msg)){
                    msg.isUser=true;
                }else if(convo.isAssistantMessage(msg)){
                    msg.isAssistant=true;
                }else if(convo.isSystemMessage(msg)){
                    msg.isSystem=true;
                }
                flat.messages.splice(i,0,msg);
                i++;
                continue;
            }
        }
    }

    if(fnSystem){

        fnSystem.unshift(
            '## Function Calling\nYou can call functions when responding to the user if any of the '+
            'functions relate to the user\'s message.\n\n<callable-functions>\n'
        )

        fnSystem.push(`</callable-functions>

To call a function respond with a JSON object with 2 properties, "functionName" and "parameters".
The value of parameters property should conform to the function parameter JSON scheme.

For example to call a function named "openFolder" with a user asks to open the folder named "My Documents"
you would respond with the following JSON object.

<call-function>
{
    "functionName":"openFolder",
    "parameters":{
        "folderName":"My Documents"
    }
}
</call-function>
`
        );

        insertSystemMessageIntoFlatConvo(fnSystem.join(''),flat);
    }

    if(!jsonMode && model.enableRespondWithTextFunction && flat.messages.some(m=>m.fn)){
        await convo.flattenSourceAsync({
            appendTo:flat,
            passExe:true,
            cacheName:'responseWithTextFunction',
            convo:model.respondWithTextFunctionSource??/*convo*/`

# You can call this function if no other functions match the user's message
> respondWithText(
    # Message to response with
    text: string
)
            `
        })
    }

    if(jsonMode && model.jsonModeImplementAsFunction){
        const isAry=lastMsg?.responseFormatIsArray;
        const convoType=`${isAry?'array(':''}${lastMsg?.responseFormatTypeName??'any'}${isAry?')':''}`;
        await convo.flattenSourceAsync({
            appendTo:flat,
            passExe:true,
            cacheName:'respondWithJSONFunction_'+convoType,
            convo:model.respondWithJSONFunctionSource?.replace('__TYPE__',convoType)??/*convo*/`

# You can call this function to return JSON values to the user
> respondWithJSON(
# JSON object. Do not serialize the value.
value: ${convoType}
)
            `
        });

    }

    return {lastMsg,jsonMode,hasFunctions}
}

export const applyConvoModelConfigurationToOutput=(
    model:ConvoModelInfo,
    flat:FlatConvoConversation,
    output:ConvoCompletionMessage[],
    {
        lastMsg,
        jsonMode,
        hasFunctions,
    }:ConvoModelConfigurationToInputResult,
)=>{
    for(let i=0;i<output.length;i++){
        const msg=output[i];
        if(!msg){
            continue;
        }

        if(hasFunctions && !model.supportsFunctionCalling && msg.content && msg.content.includes('"functionName"')){
            try{
                let content=msg.content;
                if(content.includes('<call')){
                    content=content.replace(/<\/?call-?function\/?>/g,'');
                }
                const call:SimulatedConvoFunctionCall=parseConvoJsonMessage(content);
                if(call.functionName && call.parameters){
                    output[i]=createFunctionCallConvoCompletionMessage({
                        flat,
                        callFn:call.functionName,
                        callParams:call.parameters,
                        toolId:uuid(),
                        model:model.name,
                        inputTokens:msg?.inputTokens,
                        outputTokens:msg?.outputTokens,
                        tokenPrice:msg.tokenPrice,
                    })
                }
            }catch{}
        }

        if(model.enableRespondWithTextFunction && msg.callFn==='respondWithText'){
            output[i]=createTextConvoCompletionMessage({
                flat,
                role:msg.role??'assistant',
                content:msg.callParams?.text,
                model:msg.model??convoAnyModelName,
                inputTokens:msg.inputTokens,
                outputTokens:msg.outputTokens,
                tokenPrice:msg.tokenPrice,
            })
        }

        if(model.jsonModeImplementAsFunction && jsonMode){
            if(msg.callFn==='respondWithJSON'){
                let paramValue=msg.callParams?.value??null;
                if( lastMsg?.responseFormatTypeName &&
                    lastMsg?.responseFormatTypeName!=='string' &&
                    (typeof paramValue === 'string')
                ){
                    paramValue=parseJson5(paramValue)
                }
                output[i]=createTextConvoCompletionMessage({
                    flat,
                    role:msg.role??'assistant',
                    content:JSON.stringify(paramValue),
                    model:msg.model??convoAnyModelName,
                    inputTokens:msg.inputTokens,
                    outputTokens:msg.outputTokens,
                    tokenPrice:msg.tokenPrice,
                    defaults:{
                        format:'json',
                        formatTypeName:lastMsg?.responseFormatTypeName,
                        formatIsArray:lastMsg?.responseFormatIsArray,
                    }
                })
            }else{
                output.splice(i,1);
                i--;
            }
        }
    }
}

const applyJsonModeToMessage=(msg:FlatConvoMessage,model:ConvoModelInfo,flat:FlatConvoConversation)=>
{
    if(msg.responseFormat!=='json' || model.jsonModeInstructions){
        return;
    }

    if(!msg.suffix){
        msg.suffix='\n\n';
    }

    if(model.jsonModeInstructions){
        msg.suffix=model.jsonModeInstructions
    }else if(model.jsonModeImplementAsFunction){
        msg.suffix='Call the respondWithJSON function';
    }else if(msg.responseFormatTypeName){
        const type=flat.exe.getVar(msg.responseFormatTypeName);

        let scheme=convoTypeToJsonScheme(type);

        if(!scheme){
            throw new ConvoError('invalid-message-response-scheme',{},`${msg.responseFormatTypeName} does not point to a convo type object `);
        }

        if(msg.responseFormatIsArray){
            scheme={
                type:'object',
                required:['values'],
                properties:{
                    values:{
                        type:'array',
                        items:scheme
                    }
                }
            }
        }

        msg.suffix+=`\n\nReturn a well formatted JSON ${msg.responseFormatIsArray?'array':'object'} that conforms to the following JSON Schema:\n${
            JSON.stringify(scheme)
        }`;
    }else{
        msg.suffix+=`\n\nReturn a well formatted JSON ${msg.responseFormatIsArray?'array':'object'}.`;
    }

    if(model.jsonModeInstructWrapInCodeBlock){
        msg.suffix+='\n\nWrap the generated JSON in a markdown json code fence and do not include any pre or post-amble.'
    }

    if(model.jsonModeInstructionsPrefix){
        msg.suffix=`${model.jsonModeInstructionsPrefix}\n\n${msg.suffix}`;
    }

    if(model.jsonModeInstructionsSuffix){
        msg.suffix=`${msg.suffix}\n\n${model.jsonModeInstructionsSuffix}`;
    }
}
