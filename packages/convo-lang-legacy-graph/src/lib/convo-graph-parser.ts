import { ConvoExecutionContext, ConvoMessage, ConvoParsingOptions, getConvoTag, parseConvoCode, parseConvoJsonOrStringMessage } from "@convo-lang/convo-lang";
import { CodeParser, getCodeParsingError, shortUuid } from "@iyio/common";
import { createEmptyConvoGraphDb } from "./convo-graph-lib";
import { ConvoEdge, ConvoGraphMsgType, ConvoGraphParsingData, ConvoGraphParsingResult, ConvoInputTemplate, ConvoNode, ConvoNodeStep, isConvoGraphMsgType } from "./convo-graph-types";

const exitEarly=false;


export const parseConvoGraphCode:CodeParser<ConvoGraphParsingData>=(code:string,options?:ConvoParsingOptions):ConvoGraphParsingResult=>{

    const result=parseConvoCode(code,{
        logErrors:true,
        ...options,
        includeLineNumbers:true,
    });

    if(result.error || !result.result || exitEarly){
        return {
            endIndex:result.endIndex,
            error:result.error,
        }
    }

    const startIndex=options?.startIndex??0;
    let index=startIndex;

    const messages=result.result;

    let currentNode:ConvoNode|null=null;
    let currentStep:ConvoNodeStep|null=null;
    let stepContentMsg:ConvoMessage|null=null;
    let error:string|undefined;

    const db=createEmptyConvoGraphDb();
    let metadata:Record<string,string>={}

    const exe=new ConvoExecutionContext();
    const getArgs=(msg:ConvoMessage):Record<string,any>|string=>{
        if(!msg.fn){
            return {}
        }
        const argsResult=exe.paramsToObj(msg.fn.params);

        if(argsResult.valuePromise){
            return 'message args using async';
        }
        return argsResult.value??{};
    }

    const appendContent=(endIndex:number):boolean=>{
        if(!stepContentMsg){
            return true;
        }

        if(stepContentMsg.sourceCharIndex===undefined){
            error='content message source char index undefined';
            return false;
        }

        if(!currentNode){
            error='No current node to append message content to';
            return false;
        }

        const content=code.substring(stepContentMsg.sourceCharIndex,endIndex);
        if(currentStep){
            currentStep.convo+='\n\n'+content;
        }else{
            if(currentNode.sharedConvo){
                currentNode.sharedConvo+='\n\n'+content;
            }else{
                currentNode.sharedConvo=content;
            }
        }

        stepContentMsg=null;
        return true;
    }

    parsingLoop: for(let i=0;i<messages.length;i++){
        const msg=messages[i];
        if(!msg){continue}


        if(msg.sourceCharIndex===undefined){
            error='message source char index undefined';
            break parsingLoop;
        }

        index=msg.sourceCharIndex;
        const fn=msg.fn;

        if(!appendContent(index)){
            break parsingLoop;
        }

        let type:ConvoGraphMsgType|undefined;
        let key:string|undefined;

        if(isConvoGraphMsgType(msg.role)){
            type=msg.role;
        }else if(isConvoGraphMsgType(fn?.name)){
            type=fn.name;
        }else if(fn?.modifiers){
            for(const m of fn.modifiers){
                if(isConvoGraphMsgType(m)){
                    type=m;
                    key=fn.name;
                }
            }
        }

        if(type){

            const args=getArgs(msg);
            if(typeof args==='string'){
                error=args;
                break parsingLoop;
            }

            switch(type){

                case 'node':

                    if(!fn){
                        error='Node messages must be defined as functions';
                        break parsingLoop;
                    }

                    currentNode={
                        ...args,
                        id:args['id']??shortUuid(),
                        key:args['key']??key,
                        steps:[],
                    }
                    db.nodes.push(currentNode);
                    currentStep=null;
                    break;

                case 'step':

                    if(!fn){
                        error='Step messages must be defined as functions';
                        break parsingLoop;
                    }

                    if(!currentNode){
                        error='Step messages can only appear under nodes';
                        break parsingLoop;
                    }
                    currentStep={
                        ...args,
                        name:args['name']??key,
                        convo:''
                    }
                    currentNode.steps.push(currentStep);
                    break;

                case 'edge':{

                    if(!fn){
                        error='Edge messages must be defined as functions';
                        break parsingLoop;
                    }

                    const to=args['to']??fn.returnType;
                    if(!to){
                        error='Edges must define to as its return type or pass a to args';
                        break parsingLoop;
                    }
                    const edge:ConvoEdge={
                        ...args,
                        id:args['id']??shortUuid(),
                        from:args['from']??fn.name,
                        to,
                    }
                    if(fn.body?.length){
                        const first=fn.body[0];
                        const last=fn.body[fn.body.length-1];
                        if(first && last){
                            const cond=code.substring(first.s,last.c??last.e);
                            if(cond.trim()){
                                edge.conditionConvo=cond;
                            }
                        }
                    }
                    db.edges.push(edge);
                    break;
                }

                case 'input':{
                    currentStep=null;
                    currentNode=null;
                    const value=parseConvoJsonOrStringMessage(msg.content,true);
                    const input:ConvoInputTemplate={
                        id:getConvoTag(msg.tags,'id')?.value||shortUuid(),
                        isJson:value.isJson?true:undefined,
                        value:value.value
                    }
                    if(msg.tags){
                        for(const tag of msg.tags){
                            if((input as any)[tag.name]!==undefined || !tag.value){
                                continue;
                            }
                            (input as any)[tag.name]=numberInputProps.includes(tag.name as any)?Number(tag.value):tag.value;
                        }
                    }
                    db.inputs.push(input);
                    break;
                }

                case 'graph':{
                    const value=parseConvoJsonOrStringMessage(msg.content);
                    if((typeof value.value === 'object') && value.value){
                        metadata={...metadata,...value.value};
                    }
                    break;
                }
            }

        }else{
            if(!currentNode){
                error=`Non graph type messages must be defined within a node or node step. message: ${JSON.stringify(msg)}`;
                break parsingLoop;
            }
            stepContentMsg=msg;
        }

    }

    appendContent(code.length-1);


    if(error){
        return {
            endIndex:index,
            error:getCodeParsingError(code,index,error),
        }
    }else{
        db.metadata=metadata;
        return {
            endIndex:index,
            result:{
                db,
                messages,
            },
        }
    }

}

const numberInputProps:(keyof ConvoInputTemplate)[]=['x','y'];
