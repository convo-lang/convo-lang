import { CodeParser, getCodeParsingError, getLineNumber, parseMarkdown } from '@iyio/common';
import { parse as parseJson5 } from "json5";
import { allowedConvoDefinitionFunctions, collapseConvoPipes, convoArgsName, convoBodyFnName, convoCallFunctionModifier, convoCaseFnName, convoDefaultFnName, convoExternFunctionModifier, convoInvokeFunctionModifier, convoInvokeFunctionName, convoJsonArrayFnName, convoJsonMapFnName, convoLocalFunctionModifier, convoRoles, convoSwitchFnName, convoTags, convoTestFnName, getConvoMessageComponentMode, getConvoStatementSource, getConvoTag, isValidConvoIdentifier, parseConvoBooleanTag } from "./convo-lib";
import { ConvoFunction, ConvoMessage, ConvoNonFuncKeyword, ConvoParsingOptions, ConvoParsingResult, ConvoStatement, ConvoTag, ConvoValueConstant, convoNonFuncKeywords, convoValueConstants, isConvoComponentMode } from "./convo-types";

type StringType='"'|"'"|'---'|'>';

const fnMessageReg=/(>)[ \t]*(\w+)?[ \t]+(\w+)\s*([*?!]*)\s*(\()/gs;
const topLevelMessageReg=/(>)\s*(do|result|define|debug|end)/gs;
const roleReg=/(>)[ \t]*(\w+)[ \t]*([*?!]*)/g;

const statementReg=/([\s\n\r]*[,;]*[\s\n\r]*)((#|\/\/|@|\)|\}\}|\}|\]|<<|>|$)|((\w+|"[^"]*"|'[^']*')(\??):)?\s*(([\w.]+)\s*=)?\s*('|"|-{3,}|[\w.]+\s*(\()|[\w.]+|-?[\d.]+|\{|\[))/gs;
const spaceIndex=1;
const ccIndex=3;
const labelIndex=5;
const optIndex=6;
const setIndex=8;
const valueIndex=9;
const fnOpenIndex=10;

const returnTypeReg=/\s*(\w+)?\s*->\s*(\w+)?\s*(\(?)/gs;

const numberReg=/^-?[.\d]/;

const singleStringReg=/\{\{|'/gs;
const doubleStringReg=/"/gs;
const heredocStringReg=/-{3,}/gs;
const msgStringReg=/(\{\{|[\n\r]\s*>|$)/gs;

const heredocOpening=/^([^\n])*\n(\s*)/;
const hereDocReplace=/\n(\s*)/g;

const tagReg=/(\w+)\s*=?(.*)/

const space=/\s/;
const allSpace=/^\s$/;

const tagOrCommentReg=/(\n|\r|^)[ \t]*(#|@|\/\/)/;

const paramTrimPlaceHolder='{{**PLACE_HOLDER**}}';

const getInvalidSwitchStatement=(statement:ConvoStatement):ConvoStatement|undefined=>{
    if(!statement.params){
        return undefined;
    }
    let valCount=0;
    for(let i=0;i<statement.params.length;i++){
        if(!statement.params[i]?.mc){
            valCount++;
            if(valCount>2){
                return statement.params[i];
            }
        }else{
            valCount=0;
        }

    }
    return undefined;
}


const trimLeft=(value:string,count:number):string=>{
    const lines=value.split('\n');
    for(let l=0;l<lines.length;l++){
        const line=lines[l];
        if(!line){
            continue;
        }
        let i=0;
        while(i<count && i<line.length && (line[i]===' ' || line[i]==='\t')){
            i++;
        }
        if(i){
            lines[l]=line.substring(i);
        }
    }
    return lines.join(value.includes('\r')?'\r\n':'\n');

}

export const parseConvoCode:CodeParser<ConvoMessage[],ConvoParsingOptions>=(code:string,options?:ConvoParsingOptions):ConvoParsingResult=>{

    const debug=options?.debug;

    code=code+'\n';

    const messages:ConvoMessage[]=[];
    const parseMd=options?.parseMarkdown??false;

    let inMsg=false;
    let inFnMsg=false;
    let inFnBody=false;
    let msgName:string|null=null;
    let whiteSpaceOffset=0;
    let stringEndReg=singleStringReg;
    const stringStack:StringType[]=[];
    const stringStatementStack:ConvoStatement[]=[];
    let inString:StringType|null=null;
    let lastComment='';
    let tags:ConvoTag[]=[];
    const includeLineNumbers=options?.includeLineNumbers;
    let index=options?.startIndex??0;
    let currentMessage:ConvoMessage|null=null;
    let currentFn:ConvoFunction|null=null;
    let error:string|undefined=undefined;
    const stack:ConvoStatement[]=[];
    const len=code.length;

    const setLineNumber=(msg:ConvoMessage)=>{
        let ci=index;

        let e=ci-1;
        while(true){
            let s=code.lastIndexOf('\n',e);
            if(s===-1){
                break;
            }

            const line=code.substring(s,e+1).trim();
            const isMeta=line.startsWith('#') || line.startsWith('@') || line.startsWith('//');

            if(line && !isMeta){
                break;
            }
            e=s-1;
            if(isMeta){
                ci=s;
            }
            if(e<0){
                break;
            }

        }

        msg.sourceCharIndex=ci;
        msg.sourceLineNumber=getLineNumber(code,index);
        (msg as any).__=code.substring(msg.sourceCharIndex,msg.sourceCharIndex+50);
    }

    const setStringEndReg=(type:StringType)=>{
        switch(type){

            case '\'':
                stringEndReg=singleStringReg;
                break;

            case '"':
                stringEndReg=doubleStringReg;
                break;

            case '---':
                stringEndReg=heredocStringReg;
                break;

            case '>':
                stringEndReg=msgStringReg;
                break;
        }
    }

    const openString=(type:StringType,s?:ConvoStatement):ConvoStatement=>{
        debug?.('OPEN STRING',type,`|${code.substring(index,index+20)}|`);
        inString=type;
        stringStack.push(type);
        if(!s){
            s=addStatement({s:index,e:index+type.length});
        }
        stringStatementStack.push(s);
        setStringEndReg(type);
        return s;
    }

    const closeString=()=>{
        const last=stringStatementStack[stringStatementStack.length-1];
        if(!last){
            error='No string on string stack';
            return false;
        }
        last.c=index;
        debug?.('CLOSE STRING',last?.fn?JSON.stringify(last,null,4):last?.value);
        if(stack.includes(last)){
            if(stack[stack.length-1]!==last){
                error='String not on top of stack';
                return false;
            }
            stack.pop();
        }
        stringStack.pop();
        stringStatementStack.pop();
        inString=null;
        const lastType=stringStack[stringStack.length-1];
        if(lastType){
            setStringEndReg(lastType);
        }
        return true;
    }

    const takeComment=(drop=false)=>{
        index++;
        const newline=code.indexOf('\n',index);
        if(!drop){
            const comment=code.substring(index,newline).trim();
            if(lastComment.trim()){
                lastComment+='\n'+comment;
            }else{
                lastComment=comment
            }
        }
        index=newline;
    }

    const takeTag=()=>{
        index++;
        const newline=code.indexOf('\n',index);
        const tag=tagReg.exec(code.substring(index,newline).trim());
        if(tag){
            debug?.('TAG',tag);
            const v=tag[2]?.trim()
            tags.push({name:tag[1]??'',value:v?v:undefined});
        }
        index=newline;
    }

    const addStatement=(s:ConvoStatement)=>{
        const last=stack[stack.length-1];
        if(!last){
            return s;
        }
        if(!last.params){
            last.params=[];
        }
        last.params.push(s);
        return s;
    }

    /**
     * Ends a text content message
     */
    const endStrMsg=()=>{

        const startIndex=currentMessage?.statement?.s??0;

        if( currentMessage?.statement &&
            !currentMessage.statement.fn &&
            (typeof currentMessage.statement.value === 'string')
        ){
            currentMessage.content=currentMessage.statement.value.trim();
        }
        let end=(
            currentMessage?.content??
            currentMessage?.statement?.params?.[(currentMessage?.statement?.params?.length??0)-1]?.value
        )

        // Remove tags and comments for next message and move index back
        if(currentMessage && typeof end === 'string' && tagOrCommentReg.test(end)){

            let e=index-1;
            const hasNewline=end.includes('\n');
            while(true){
                let s=code.lastIndexOf('\n',e);
                if(s<startIndex){
                    if(!hasNewline){
                        s=startIndex;
                    }else{
                        error='Start of captured tags and comments not found at end of text message';
                        return false;
                    }
                }
                if(s===-1){
                    break;
                }

                const line=code.substring(s,e+1).trim();

                if(line && !line.startsWith('#') && !line.startsWith('//') && !line.startsWith('@')){
                    break;
                }
                e=s-1;
                index=s;

                if(e<0){
                    break;
                }

            }

            e=end.length-1;
            while(e>=0){
                const s=hasNewline?end.lastIndexOf('\n',e):0;
                if(s===-1){
                    break;
                }

                const line=end.substring(s,e+1).trim();

                if(line && !line.startsWith('#') && !line.startsWith('//') && !line.startsWith('@')){
                    break;
                }
                e=s-1;

                if(e<0){
                    break;
                }

            }

            debug?.('endMsg',end,currentMessage);
            end=end.substring(0,e+1).trimEnd();
            if(allSpace.test(end)){
                end='';
            }
            if(currentMessage.content!==undefined){
                currentMessage.content=end;
            }else if(currentMessage.statement?.params){
                if(end){
                    const last=currentMessage.statement.params[currentMessage.statement.params.length-1];
                    if(last){
                        last.value=end;
                    }
                }else{
                    currentMessage.statement.params.pop();
                }
            }

        }
        if(whiteSpaceOffset){
            if(typeof currentMessage?.content === 'string'){
                currentMessage.content=trimLeft(currentMessage.content,whiteSpaceOffset);
            }
            if(currentMessage?.statement?.params){
                const lines=trimLeft(
                    currentMessage?.statement?.params
                        .map(p=>(typeof p.value==='string')?p.value:paramTrimPlaceHolder).join(''),
                    whiteSpaceOffset
                ).split(paramTrimPlaceHolder);

                for(let i=0;i<lines.length;i++){
                    const v=lines[i];
                    const param=currentMessage.statement.params[i===0?0:i*2];
                    if(param){
                        param.value=v;
                    }
                }
            }
        }

        if(currentMessage){
            const formatTag=getConvoTag(currentMessage.tags,convoTags.format);
            if(formatTag?.value==='json'){
                if(currentMessage.content===undefined){
                    index=startIndex;
                    error='Messages that contain embeds can not use @format json';
                    return false;
                }
                try{
                    currentMessage.jsonValue=parseJson5(currentMessage.content);
                }catch(ex){
                    index=startIndex;
                    error=`Message contains invalid json - ${(ex as any)?.message}`;
                    return false;
                }
            }

            const assignTag=getConvoTag(currentMessage.tags,convoTags.assign);
            if(assignTag?.value){
                if(!isValidConvoIdentifier(assignTag.value)){
                    index=startIndex;
                    error='Invalid assign var name';
                    return false;
                }
                currentMessage.assignTo=assignTag.value;
            }

            if(currentMessage.statement){
                currentMessage.statement.e=index;
            }
        }
        msgName=null;
        currentMessage=null;
        inMsg=false;
        stack.pop();
        return true;
    }

    parsingLoop: while(index<len){



        if(inString){
            const strStatement=stringStatementStack[stringStatementStack.length-1];
            if(!strStatement){
                error='No string statement found';
                break parsingLoop;
            }
            let escaped:boolean;
            let embedFound:boolean;
            let endStringIndex:number;
            let nextIndex:number=index;
            const isMsgString=inString==='>';
            do{
                stringEndReg.lastIndex=nextIndex;
                const e=stringEndReg.exec(code)

                if(!e){
                    error='End of string not found';
                    break parsingLoop;
                }


                embedFound=e[0]==='{{';
                endStringIndex=e.index;
                nextIndex=(isMsgString && !embedFound)?e.index+e[0].length-1:e.index+e[0].length;

                if(isMsgString && !embedFound){
                    escaped=false;
                }else{
                    let backslashCount=0;
                    for(let bi=endStringIndex-1;bi>=0;bi--){
                        if(code[bi]!=='\\'){
                            break;
                        }
                        backslashCount++;
                    }
                    escaped=backslashCount%2===1;
                }
            }while(escaped)

            let content=code.substring(index,endStringIndex);
            if(inFnMsg){
                content=unescapeStr(content);
            }else{
                content=unescapeMsgStr(content);
            }

            if(embedFound){
                if(!strStatement.params){
                    strStatement.params=[];
                }
                if(!strStatement.fn){
                    strStatement.fn='md';
                    stack.push(strStatement);
                }
                strStatement.params.push({value:content,s:index,e:nextIndex});
                inString=null;
                index=nextIndex;
            }else{

                if(inString==='---'){
                    const openMatch=heredocOpening.exec(content);
                    if(openMatch){
                        const l=openMatch[2]?.length??0;
                        strStatement.value=content.replace(hereDocReplace,(_:string,space:string)=>{
                            return '\n'+space.substring(l)
                        })
                        if(openMatch[1]?.trim()){
                            strStatement.value=strStatement.value.trim();
                        }
                    }else{
                        strStatement.value=content;
                    }
                }else{
                    if(strStatement.params){// has embeds
                        if(content){
                            strStatement.params.push({value:content,s:index,e:nextIndex});
                        }
                        if(isMsgString){
                            removeBackslashes(strStatement.params);
                        }
                    }else{
                        strStatement.value=content;
                    }
                }
                index=nextIndex;
                if(!closeString()){
                    break parsingLoop;
                }
                if(isMsgString && !endStrMsg()){
                    break parsingLoop;
                }
                debug?.('AFTER STRING','|'+code.substring(index,index+30)+'|');
            }
        }else if(inMsg || inFnMsg){

            statementReg.lastIndex=index;
            let match=statementReg.exec(code);
            if(!match){
                error=inFnMsg?'Unexpected end of function':'Unexpected end of message';
                break parsingLoop;
            }

            const cc=match.length===2?match[1]:match[ccIndex];
            const indexOffset=match[0].length;
            const spaceLength=(match[spaceIndex]?.length??0);

            debug?.('STATEMENT MATCH',index,`||${cc}||`,`<<||${code.substring(index+spaceLength,index+indexOffset)}||>>`,match)

            if(match.index!==index){
                index=match.index-1;
                error=`Invalid character in function body (${code[index]})`;
                break parsingLoop;
            }


            if(cc==='#' || cc==='//'){
                index+=spaceLength;
                takeComment(cc==='//');
                continue;
            }else if(cc==='@'){
                index+=spaceLength;
                takeTag();
                continue;
            }else if(cc==='<<'){
                const last=stack[stack.length-1];
                if(!last){
                    error='Pipe operator used outside of a parent statement';
                    break parsingLoop;
                }
                if(last.params?.length && last.params[last.params.length-1]?._pipe){
                    error='Pipe operator followed by another pipe operator';
                    break parsingLoop;
                }
                last._hasPipes=true;
                addStatement({
                    s:index,
                    e:index+indexOffset,
                    _pipe:true,
                })
                index+=indexOffset;
                continue;
            }else if(cc===')' || cc==='}}' || cc==='}' || cc===']' || cc==='>' || cc===''){// close function
                if(cc==='}' && stack[stack.length-1]?.fn!==convoJsonMapFnName){
                    index+=indexOffset-1;
                    error="Unexpected closing of JSON object";
                    break parsingLoop;
                }
                if(cc===']' && stack[stack.length-1]?.fn!==convoJsonArrayFnName){
                    index+=indexOffset-1;
                    error="Unexpected closing of JSON array";
                    break parsingLoop;
                }
                if(cc==='>' && !currentFn?.topLevel){
                    index+=indexOffset-1;
                    error='Unexpected end of function using (>) character';
                    break parsingLoop;
                }
                if(cc!=='>'){
                    lastComment='';
                }
                if(tags.length && cc!=='>'){
                    tags=[];
                }
                const lastStackItem=stack[stack.length-1];
                if(!stack.length || !lastStackItem){
                    index+=indexOffset-1;
                    error='Unexpected end of function call';
                    break parsingLoop;
                }
                if(lastStackItem._hasPipes){
                    collapseConvoPipes(lastStackItem);
                }
                if(lastStackItem.hmc){
                    const invalid=getInvalidSwitchStatement(lastStackItem);
                    if(invalid){
                        index=invalid.s;
                        error=(
                            'Switch statements should not switch the current switch value without at least 1 match statement between the 2 value statements.'+
                            'Use a do or fn statement to execute multiple statements after a switch match'
                        );
                        break parsingLoop;
                    }
                }
                const endEmbed=cc==='}}';
                const startIndex=index;
                if(cc==='>'){
                    index+=(match[spaceIndex]?.length??0);
                }else{
                    index+=match[0].length;
                }
                if(!endEmbed){
                    lastStackItem.c=index;
                    stack.pop();
                }
                debug?.('POP STACK',stack.map(s=>s.fn));
                if(endEmbed){
                    const prevInStr=stringStack[stringStack.length-1];
                    if(!prevInStr){
                        index+=indexOffset-1;
                        error='Unexpected string embed closing found';
                        break parsingLoop;
                    }
                    inString=prevInStr;
                }else if(stack.length===0){

                    if(stringStack.length){
                        index+=indexOffset-1;
                        error='End of call stack reached within a string';
                        break parsingLoop;
                    }

                    if(!currentFn){
                        index+=indexOffset-1;
                        error='End of call stack reached without being in function';
                        break parsingLoop;
                    }

                    if(!inFnBody){
                        returnTypeReg.lastIndex=index;
                        const rMatch=returnTypeReg.exec(code);
                        debug?.('BODY MATCH',rMatch);
                        if(rMatch && rMatch.index===index){
                            debug?.('ENTER BODY',JSON.stringify(currentFn,null,4));
                            index+=rMatch[0].length;

                            if(rMatch[1]){
                                currentFn.paramType=rMatch[1];
                                for(const p of currentFn.params){
                                    if(p.label){
                                        index=p.s;
                                        error='Functions that define a parameter collection type should not define individual parameter types';
                                        break parsingLoop;
                                    }
                                }
                            }

                            if(rMatch[2]){
                                currentFn.returnType=rMatch[2];
                            }

                            if(rMatch[3]){
                                inFnBody=true;
                                currentFn.body=[];
                                const body:ConvoStatement={fn:convoBodyFnName,params:currentFn.body,s:startIndex,e:index}
                                stack.push(body);
                                continue;
                            }
                        }
                    }

                    inFnMsg=false;
                    inFnBody=false;
                    currentFn=null;
                    msgName=null;

                }
                continue;
            }

            let val=match[valueIndex]||undefined;
            const label=match[labelIndex]?.replace(/["']/g,'')||undefined;
            const opt=match[optIndex]?true:undefined;
            const set=match[setIndex]||undefined;
            if(val==='{'){
                debug?.('jsonMap',);
                statementReg.lastIndex=0;
                match=statementReg.exec(`${convoJsonMapFnName}(`);
                if(!match){
                    index+=indexOffset-1;
                    error='JSON map open match expected';
                    break parsingLoop;
                }
                val=match[valueIndex]||undefined
            }else if(val==='['){
                debug?.('jsonArray',);
                statementReg.lastIndex=0;
                match=statementReg.exec(`${convoJsonArrayFnName}(`);
                if(!match){
                    index+=indexOffset-1;
                    error='JSON map open match expected';
                    break parsingLoop;
                }
                val=match[valueIndex]||undefined
            }



            const statement:ConvoStatement={s:index+spaceLength,e:index+indexOffset}
            if(label){
                statement.label=label
            }
            if(opt){
                statement.opt=opt
            }
            if(set){
                if(set.includes('.')){
                    const path=set.split('.');
                    statement.set=path[0];
                    path.shift();
                    statement.setPath=path;
                }else{
                    statement.set=set;
                }
            }
            if(lastComment){
                statement.comment=lastComment;
                lastComment='';
            }
            if(currentFn?.topLevel){
                if(!tags.some(t=>t.name==='local')){
                    statement.shared=true;
                }
            }
            if(tags.length){
                statement.tags=tags;
                if(!currentFn?.topLevel){
                    if(tags.some(t=>t.name==='shared')){
                        statement.shared=true;
                    }
                }
                tags=[];
            }
            addStatement(statement);

            if(match[fnOpenIndex]){//push function on stack
                if(!val || val.length<2){
                    index+=indexOffset-1;
                    error='function call name expected';
                    break parsingLoop;
                }

                statement.fn=val.substring(0,val.length-1).trim();
                if(statement.fn===convoCaseFnName || statement.fn===convoTestFnName || statement.fn===convoDefaultFnName){
                    statement.mc=true;
                    const last=stack[stack.length-1];
                    if(last?.fn!==convoSwitchFnName){
                        index=statement.s;
                        error='Switch match statement used outside of a switch';
                        break parsingLoop;
                    }
                    last.hmc=true;
                    if(last.params?.[0]===statement){
                        index=statement.s;
                        error='Switch match statement used before passing a value to match. The first parameter of a switch should be any value other than a switch match statement';
                        break parsingLoop;
                    }

                }

                if(currentFn?.definitionBlock && !allowedConvoDefinitionFunctions.includes(statement.fn as any)){
                    index+=indexOffset-1;
                    error=`Definition block calling illegal function (${statement.fn}). Definition blocks can only call the following functions: ${allowedConvoDefinitionFunctions.join(', ')}`;
                    break parsingLoop;
                }

                if(statement.fn.includes('.')){
                    const path=statement.fn.split('.');
                    statement.fn=path[path.length-1];
                    path.pop();
                    statement.fnPath=path;
                }

                stack.push(statement);
                debug?.('PUSH STACK',stack.map(s=>s.fn));
            }else if(val==='"' || val==="'"){
                openString(val,statement);
            }else if(val?.startsWith('---')){
                openString('---',statement);
            }else if(val && numberReg.test(val)){// number
                statement.value=Number(val);
            }else if(convoValueConstants.includes(val as ConvoValueConstant)){
                switch(val as ConvoValueConstant){

                    case 'true':
                        statement.value=true;
                        break;

                    case 'false':
                        statement.value=false;
                        break;

                    case 'null':
                        statement.value=null;
                        break;

                    case 'undefined':
                        statement.value=undefined;
                        break;

                    default:
                        index+=indexOffset-1;
                        error=`Unknown value constant - ${val}`;
                        break parsingLoop;
                }
            }else if(convoNonFuncKeywords.includes(val as ConvoNonFuncKeyword)){
                statement.keyword=val;
            }else if(val!==undefined){
                if(val.includes('.')){
                    const path=val.split('.');
                    statement.ref=path[0];
                    path.shift();
                    statement.refPath=path;
                }else{
                    statement.ref=val;
                }
            }else{
                index+=indexOffset-1;
                error='value expected';
                break parsingLoop;
            }

            index+=indexOffset;
        }else{
            const char=code[index];
            if(!char){
                error='character expected'
                break parsingLoop;
            }

            if(char==='>'){

                whiteSpaceOffset=0;
                while(code[index-whiteSpaceOffset-1]===' ' || code[index-whiteSpaceOffset-1]==='\t'){
                    whiteSpaceOffset++;
                }

                debug?.('WHITESPACE OFFSET',whiteSpaceOffset,code.substring(index,index+15));

                const startIndex=index;
                fnMessageReg.lastIndex=index;
                let match=fnMessageReg.exec(code);
                if(match && match.index==index){
                    msgName=match[3]??'';
                    debug?.(`NEW FUNCTION ${msgName}`,{lastComment,tags,match});
                    if(!msgName){
                        error='function name expected';
                        break parsingLoop;
                    }
                    const modifiers=match[2]?[match[2]]:[];
                    currentFn={
                        name:msgName,
                        params:[],
                        description:lastComment||undefined,
                        modifiers,
                        topLevel:false,
                    }
                    if(msgName===convoInvokeFunctionName || modifiers.includes(convoInvokeFunctionModifier)){
                        currentFn.invoke=true;
                    }
                    if(currentFn.invoke || modifiers.includes(convoLocalFunctionModifier)){
                        currentFn.local=true;
                    }
                    if(currentFn.modifiers.includes(convoCallFunctionModifier)){
                        currentFn.call=true;
                    }
                    if(currentFn.modifiers.includes(convoExternFunctionModifier)){
                        currentFn.extern=true;
                    }
                    currentMessage={
                        role:currentFn.call?'function-call':'function',
                        fn:currentFn,
                        description:lastComment||undefined,
                    }
                    if(includeLineNumbers){
                        setLineNumber(currentMessage);
                    }
                    messages.push(currentMessage);
                    lastComment='';
                    if(tags.length){
                        currentMessage.tags=tags;
                        tags=[];
                    }
                    index+=match[0].length;
                    stack.push({fn:'map',params:currentFn.params,s:startIndex,e:index});
                    inFnMsg=true;
                    inFnBody=false;
                    continue;
                }

                topLevelMessageReg.lastIndex=index;
                match=topLevelMessageReg.exec(code);
                if(match && match.index===index){
                    msgName=match[2]??'topLevelStatements';
                    debug?.(`NEW TOP LEVEL ${msgName}`,lastComment,match);
                    currentFn={
                        name:msgName,
                        body:[],
                        params:[],
                        description:lastComment||undefined,
                        modifiers:[],
                        local:false,
                        call:false,
                        topLevel:true,
                        definitionBlock:msgName==='define',
                    }
                    currentMessage={
                        role:msgName,
                        fn:currentFn,
                        description:lastComment||undefined,
                    }
                    if(includeLineNumbers){
                        setLineNumber(currentMessage);
                    }
                    messages.push(currentMessage);
                    lastComment='';
                    if(tags.length){
                        currentMessage.tags=tags;
                        tags=[];
                    }
                    index+=match[0].length;
                    const body:ConvoStatement={fn:convoBodyFnName,params:currentFn.body,s:startIndex,e:index}
                    stack.push(body);
                    inFnMsg=true;
                    inFnBody=true;
                    continue;
                }

                roleReg.lastIndex=index;
                match=roleReg.exec(code);
                if(match && match.index==index){
                    msgName=match[2]??'';
                    if(!msgName){
                        error='message role expected';
                        break parsingLoop;
                    }
                    debug?.(`NEW ROLE ${msgName}`,lastComment,match);
                    currentMessage={
                        role:msgName,
                        description:lastComment||undefined,
                    }
                    if(includeLineNumbers){
                        setLineNumber(currentMessage);
                    }
                    messages.push(currentMessage);
                    lastComment='';
                    if(tags.length){
                        currentMessage.tags=tags;
                        tags=[];
                    }
                    inMsg=true;
                    const body:ConvoStatement={fn:convoBodyFnName,s:index,e:index+match[0].length}
                    stack.push(body);
                    currentMessage.statement=openString('>');
                    index+=match[0].length;
                    continue;
                }

                error='Message or function expected';
                break parsingLoop;

            }else if(char==='#'){
                takeComment();
            }else if(char==='/' && code[index+1]==='/'){
                index++;
                takeComment(true);
            }else if(char==='@'){
                takeTag();
            }else if(space.test(char) || char===';' || char===','){
                index++;
            }else{
                error=`Unexpected character ||${char}||`;
                break parsingLoop;
            }
        }
    }

    const setMsgMarkdown=(msg:ConvoMessage)=>{
        if(msg.content!==undefined && msg.markdown===undefined){
            const mdResult=parseMarkdown(
                msg.content,
                {parseTags:true,startLine:getLineNumber(code,msg.statement?.s)}
            );
            if(mdResult.result){
                msg.markdown=mdResult.result;
            }
        }
    }

    if(!messages.length && tags.length){
        messages.push({
            tags,
            role:'define',
            fn:{
                body:[],
                call:false,
                definitionBlock:true,
                local:false,
                modifiers:[],
                name:'define',
                params:[],
                topLevel:true
            }
        })
    }

    let queueIndex=0;

    finalPass: for(let i=0;i<messages.length;i++){
        const msg=messages[i];
        if(!msg){
            error=`Undefined message in result messages at index ${i}`;
            break;
        }

        if(msg.role===convoRoles.queue){
            msg.label=`queue-${queueIndex++}`;
        }

        if(parseMd && msg.content!==undefined){
            setMsgMarkdown(msg);
        }

        const compMode=getConvoMessageComponentMode(msg.content);
        if(compMode){
            msg.component=compMode;
            if(msg.renderOnly===undefined){
                msg.renderOnly=true;
            }
        }

        if(msg.fn){

            if(!msg.fn.body && !msg.fn.call && !msg.fn.extern && !msg.fn.topLevel && (msg.fn.invoke || !msg.fn.local)){
                msg.fn.body=[
                    {
                        s:0,e:0,
                        fn:'return',
                        params:[{
                            s:0,e:0,
                            ref:convoArgsName
                        }]
                    }
                ]
            }

            if(msg.fn.invoke && msg.fn.params.length!==0){
                const s=msg.fn.params[0];
                if(s){
                    index=s.s;
                }
                error=`Immediately invoked function (${msg.fn.name}) has more that 0 parameters`;
                break;
            }
        }

        if(msg.tags){

            for(let t=0;t<msg.tags.length;t++){
                const tag=msg.tags[t];
                if(!tag){continue}
                switch(tag.name){

                    case convoTags.markdown:
                    case convoTags.markdownVars:
                        setMsgMarkdown(msg);
                        break;

                    case convoTags.template:
                        if(!msg.statement){
                            error=`template message missing statement ${JSON.stringify(msg,null,4)}`;
                            break finalPass;
                        }
                        if(msg.statement.source===undefined){
                            msg.statement.source=getConvoStatementSource(msg.statement,code);
                        }
                        break;

                    case convoTags.component:
                        msg.component=isConvoComponentMode(tag.value)?tag.value:'render';
                        if(msg.renderOnly===undefined){
                            msg.renderOnly=true;
                        }
                        break;

                    case convoTags.renderOnly:
                        msg.renderOnly=parseConvoBooleanTag(tag.value);
                        break;

                    case convoTags.suggestion:
                        msg.renderOnly=true;
                        msg.isSuggestion=true;
                        break;

                    case convoTags.thread:
                        if(tag.value){
                            msg.tid=tag.value;
                        }
                        break;

                    case convoTags.userId:
                        if(tag.value){
                            msg.userId=tag.value;
                        }
                        break;

                    case convoTags.eval:
                        msg.eval=true;
                        break;

                    case convoTags.preSpace:
                        msg.preSpace=true;
                        break;

                    case convoTags.label:
                        if(tag.value){
                            msg.label=tag.value;
                        }
                        break;

                    case convoTags.parallel:
                        if(parseConvoBooleanTag(tag.value)){
                            msg.parallel=true;
                        }
                        break;

                    default:
                        if(copyTagValues[tag.name] && tag.value){
                            (msg as any)[tag.name]=tag.value;
                        }
                }

            }
        }

        if(msg.content!==undefined && msg.statement?.source===undefined){
            delete msg.statement;
        }

    }

    return {result: messages,endIndex:index,error:error?getCodeParsingError(code,index,error):undefined};

}

/**
 * Names of tags that have a matching property in the ConvoMessage interface with a string value
 */
const copyTagValues:Record<string,boolean>={
    [convoTags.renderTarget]:true,
    [convoTags.sourceId]:true,
    [convoTags.sourceUrl]:true,
    [convoTags.sourceName]:true,

}


const unescapeStr=(str:string):string=>str.replace(/\\(.)/g,(_,char)=>{

    switch(char){
        case 'n':
            return '\n';
        case 'r':
            return '\n';
        case 't':
            return '\t';
    }

    return char;
});

const unescapeMsgStr=(str:string):string=>{

    if(str.includes('{{')){
        str=str.replace(/\\\{\{/g,'{{')
    }
    if(str.includes('>')){
        str=str.replace(/(\n|\r|^)([ \t]*)\\(\\*>)/g,(_,a,b,c)=>a+b+c);
    }

    return str;
}

const removeBackslashes=(params:ConvoStatement[])=>{

    const l=params.length-1;
    for(let i=0;i<l;i+=2){
        const s=params[i];
        if( s?.value &&
            (typeof s.value === 'string') &&
            s.value.endsWith('\\\\')
        ){
            s.value=s.value.substring(0,s.value.length-1);
        }

    }
}
