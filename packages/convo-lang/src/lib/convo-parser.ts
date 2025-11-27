import { CodeParser, CodeParsingResult, deepClone, getCodeParsingError, getErrorMessage, getLineNumber, parseMarkdown, safeParseNumberOrUndefined, starStringToRegex, strHashBase64Fs } from '@iyio/common';
import { parseJson5 } from "@iyio/json5";
import { getConvoMessageComponentMode, parseConvoComponentTransform } from './convo-component-lib.js';
import { allowedConvoDefinitionFunctions, collapseConvoPipes, convoAnonTypePrefix, convoAnonTypeTags, convoArgsName, convoBodyFnName, convoCallFunctionModifier, convoCaseFnName, convoDefaultFnName, convoDynamicTags, convoEvents, convoExternFunctionModifier, convoHandlerAllowedRoles, convoInvokeFunctionModifier, convoInvokeFunctionName, convoJsonArrayFnName, convoJsonMapFnName, convoLocalFunctionModifier, convoRoles, convoSwitchFnName, convoTags, convoTestFnName, getConvoMessageModificationAction, getConvoStatementSource, getConvoTag, localFunctionTags, parseConvoBooleanTag } from "./convo-lib.js";
import { ConvoFunction, ConvoImportMatch, ConvoMessage, ConvoNonFuncKeyword, ConvoParsingOptions, ConvoParsingResult, ConvoStatement, ConvoTag, ConvoTrigger, ConvoValueConstant, InlineConvoParsingOptions, InlineConvoPrompt, StandardConvoSystemMessage, convoImportMatchRegKey, convoNonFuncKeywords, convoValueConstants, isConvoComponentMode } from "./convo-types.js";

type StringType='"'|"'"|'---'|'>'|'???'|'===';

const fnMessageReg=/(>)[ \t]*(\w+)?[ \t]+(\w+)\s*(\()/gs;
const topLevelMessageReg=/(>)[ \t]*(do|thinkingResult|result|define|debug|end|target|make|stage|app|\w+[ \t]*!)([^\n\r]*)?/g;
const roleReg=/(>)[ \t]*(\w+)([ \t]+[^\n\r]*)?/g;

const alphaStartReg=/^\w/

const statementReg=/([\s\n\r]*[,;]*[\s\n\r]*)((#|\/\/|@|\)|\}\}|\}|\]|<<|>|$)|((\w+|"[^"]*"|'[^']*')(\??):)?\s*(([\w.]+)\s*=)?\s*('|"|\?{3,}|={3,}|\*{3,}|-{3,}|[\w.]+\s*(\()|[\w.]+|-?[\d.]+|\{|\[))/gs;
const spaceIndex=1;
const ccIndex=3;
const labelIndex=5;
const optIndex=6;
const setIndex=8;
const valueIndex=9;
const fnOpenIndex=10;

const jsonAryReg=/\s*array\((\w+)\)/

const returnTypeReg=/\s*(\w+)?\s*->\s*(\w+)?\s*(\(?)/gs;

const numberReg=/^-?[.\d]/;

const singleStringReg=/\{\{|'/gs;
const doubleStringReg=/"/gs;
const heredocStringReg=/-{3,}/gs;
const promptStringReg=/\?\?\?/gs;
const embedStringReg=/\{\{|===/gs;
const msgStringReg=/(\{\{|[\n\r]\s*>|$)/gs;

const heredocOpening=/^([^\n])*\n(\s*)/;
const hereDocReplace=/\n(\s*)/g;

const tagReg=/(\w+)\s*(=)?(.*)/

const space=/\s/;
const allSpace=/^\s$/;

const anonEscapeReg=/[_-]/g;
const anonTypeOptReg=/^\s*(array\(\s*(?<aryType>\w*)\s*\)|(?<type>\w+))\s*(?<ary>\[\s*\])?\s*$/;

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

    if(!hasMsgReg.test(code)){
        code='> user\n'+code;
    }

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
    const anonTypes:Record<string,string>={};
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

            case '???':
                stringEndReg=promptStringReg;
                break;

            case '===':
                stringEndReg=embedStringReg;
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

    const takeTag=():boolean=>{
        index++;
        const newline=code.indexOf('\n',index);
        const tag=tagReg.exec(code.substring(index,newline).trim());
        if(tag){
            debug?.('TAG',tag);
            let v=tag[3]?.trim()||undefined;
            const tagObj:ConvoTag={name:tag[1]??''};
            if(tag[2]){
                if(!convoDynamicTags.includes(tagObj.name)){
                    error=`Only ${convoDynamicTags.join(', ')} are allowed to have dynamic expressions`
                    return false;
                }
                const optAnon=anonTypeOptReg.exec(v??'');
                if(optAnon?.groups){
                    const {aryType,type,ary}=optAnon.groups;
                    if(aryType){
                        tagObj.value=aryType+'[]';
                    }else if(type){
                        tagObj.value=type+(ary?'[]':'');
                    }
                    if(tagObj.value!==v){
                        tagObj.srcValue=v;
                    }
                }else if(convoAnonTypeTags.includes(tagObj.name)){
                    const anonType=convoAnonTypePrefix+(
                        strHashBase64Fs(v??'')
                        .replace(anonEscapeReg,(value)=>'_'+(value==='_'?'0':'1'))
                    );
                    if(!anonTypes[anonType]){
                        const r=parseConvoCode(`> define\n${anonType}=${v}`);
                        if(r.error){
                            error=r.error.message;
                            return false;
                        }
                        if(!r.result){
                            error='Define statement expected from dynamic anon tag value parsing';
                            return false;
                        }
                        messages.push(...r.result);
                        anonTypes[anonType]=v??'';
                    }
                    tagObj.value=anonType;
                    tagObj.srcValue=v;
                }else{
                    const r=parseConvoCode(`> do\n${v}`);
                    if(r.error){
                        error=r.error.message;
                        return false;
                    }
                    tagObj.srcValue=v;
                    tagObj.statement=r.result?.[0]?.fn?.body;
                }
            }else{
                tagObj.value=v;
            }
            tags.push(tagObj);
        }
        index=newline;
        return true;
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
                        end=''
                        break;
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
                    const isStatic=inString==='===';
                    if(inString==='???' || isStatic){
                        const prompt=parseInlineConvoPrompt(strStatement,{isStatic:isStatic,applyToStatement:isStatic});
                        if(prompt.error || !prompt.result){
                            error=prompt.error?.message??'Inline prompt to parsed by inline parser';
                            index+=prompt.endIndex;
                            break parsingLoop;
                        }
                        strStatement.prompt=prompt.result;
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
                if(!takeTag()){
                    break parsingLoop;
                }
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
            }else if(val?.startsWith('???')){
                openString('???',statement);
            }else if(val?.startsWith('===')){
                openString('===',statement);
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
                if(match && match.index==index && match[2]!==convoRoles.thinking){
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
                if(match && match.index===index && !alphaStartReg.test(match[3]??'')){
                    msgName=match[2]??'topLevelStatements';
                    if(msgName.endsWith('!')){
                        msgName=msgName.substring(0,msgName.length-1).trim();
                    }
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
                        head:match[3]?.trim()||undefined,
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
                        head:match[3]?.trim()||undefined,
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
                    if(msgName===convoRoles.insert){
                        let endI=code.indexOf('\n',index);
                        if(endI===-1){
                            endI=code.length;
                        }
                        const parts=code.substring(index,endI).split(' ');
                        currentMessage.insert={
                            label:parts[1]??'',
                            before:parts[0]==='before',
                        }
                        index=endI;
                    }
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
                if(!takeTag()){
                    break parsingLoop;
                }
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

    if(tags.length || lastComment){
        messages.push({
            tags:tags.length?tags:undefined,
            description:lastComment||undefined,
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

    finalPass: for(let i=0;i<messages.length;i++){
        const msg=messages[i];
        if(!msg){
            error=`Undefined message in result messages at index ${i}`;
            break;
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
                if(msg.fn && localFunctionTags.includes(tag.name)){
                    msg.fn.local=true;
                }
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

                    case convoTags.cid:
                        if(tag.value){
                            msg.cid=tag.value;
                        }
                        break;

                    case convoTags.name:
                        if(tag.value){
                            msg.name=tag.value;
                        }
                        break;

                    case convoTags.importMatch:
                        if(tag.value){
                            const r=parseConvoImportMatch(tag.value);
                            if(r.error){
                                error=`Invalid importMatch tag value(${tag.value}): ${r.error.message}`;
                                break finalPass;
                            }
                            msg.importMatch=r.result;
                        }
                        break;

                    case convoTags.hidden:
                        msg.renderTarget='hidden';
                        break;

                    case convoTags.json:
                        if(tag.statement){

                        }else if(tag.value){
                            const jsonAryMatch=jsonAryReg.exec(tag.value);
                            if(jsonAryMatch){
                                tag.srcValue=tag.value;
                                tag.value=jsonAryMatch[1]+'[]';
                            }
                        }
                        break;

                    case convoTags.messageHandler:
                        if(tag.value && msg.fn){
                            const roles=tag.value.split(/\s+/g);
                            if(!msg.fn.handlesMessageRoles){
                                msg.fn.handlesMessageRoles=[];
                            }
                            for(const role of roles){
                                if((role in convoRoles) && !convoHandlerAllowedRoles.includes(role as any)){
                                    error=`Registering message handlers for role (${role}) is not allowed`;
                                    break finalPass;
                                }
                                if(!msg.fn.handlesMessageRoles.includes(role)){
                                    msg.fn.handlesMessageRoles.push(role);
                                }
                            }
                        }
                        break;

                    case convoTags.on:
                        if(tag.value && msg.fn){
                            const i=tag.value.indexOf(' ');
                            const name=i===-1?tag.value:tag.value.substring(0,i);
                            const content=i===-1?'':tag.value.substring(i+1).trim();
                            const trigger=parseConvoMessageTrigger(
                                name,
                                msg.fn.name,
                                content,
                                name===convoEvents.assistant?convoRoles.assistant:name===convoRoles.user?convoRoles.user:undefined,
                            );
                            if(trigger.error){
                                error=`Failed to parse trigger condition for message ${msg.fn.name} - ${trigger.error.message}`;
                                break finalPass;
                            }else if(trigger.result){
                                if(!msg.messageTriggers){
                                    msg.messageTriggers=[];
                                }
                                msg.messageTriggers.push(trigger.result);
                            }
                        }
                        break;

                    case convoTags.transformComponent:{
                        const parsed=parseConvoComponentTransform(tag.value);
                        if(parsed){
                            if(!msg.tags.some(t=>t.name===convoTags.transform)){
                                msg.tags.push({
                                    name:convoTags.transform,
                                    value:parsed.propType,
                                })
                            }
                            msg.tags.push({
                                name:convoTags.transformTag,
                                value:`${convoTags.component} ${parsed.componentName}`,
                            })

                            if(!msg.tags.some(t=>t.name===convoTags.transformHideSource)){
                                msg.tags.push({
                                    name:convoTags.transformHideSource,
                                    value:parsed.condition,
                                })
                            }

                            if(parsed.condition && !msg.tags.some(t=>t.name===convoTags.transformComponentCondition)){
                                msg.tags.push({
                                    name:convoTags.transformComponentCondition,
                                    value:parsed.condition,
                                })
                            }

                            if(!msg.tags.some(t=>t.name===convoTags.transformRenderOnly)){
                                msg.tags.push({
                                    name:convoTags.transformRenderOnly,
                                })
                            }

                            if(!msg.tags.some(t=>t.name===convoTags.transformGroup)){
                                msg.tags.push({
                                    name:convoTags.transformGroup,
                                    value:parsed.groupName||parsed.componentName,
                                })
                            }
                        }
                        break;
                    }

                    case convoTags.docRef:
                        if(tag.value){
                            if(!msg.docRefs){
                                msg.docRefs=[];
                            }
                            const docRef=parseJson5(tag.value);
                            msg.docRefs.push(docRef);
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

    const parsingResult={
        result:messages,
        endIndex:index,
        error:error?getCodeParsingError(code,index,error):undefined
    };

    if(parsingResult.error && options?.logErrors){
        console.error(`Convo parsing error`,parsingResult.error);
    }

    return parsingResult;

}

/**
 * Names of tags that have a matching property in the ConvoMessage interface with a string value
 */
const copyTagValues:Record<string,boolean>={
    [convoTags.renderTarget]:true,

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

/**
 * Parses a message trigger tag value to extract the trigger action and optional condition.
 * Supports syntax like "replace condition" or "append" where the condition is optional.
 *
 * @param eventName - Name of the event the trigger will listen to
 * @param fnName - The name of the function to be called by the trigger
 * @param condition - string condition. Should start with a `=` character or the condition will be ignored
 * @param role - The message role that will trigger this function
 * @returns Parsed ConvoMessageTrigger object, or undefined if parsing fails
 */
export const parseConvoMessageTrigger=(eventName:string,fnName:string,condition:string,role?:string):CodeParsingResult<ConvoTrigger>=>{
    // todo - parse condition as conditional code

    let cond:ConvoStatement[]|undefined;
    let endIndex=0;
    condition=condition.trim();
    if(condition.startsWith('=')){
        const r=parseConvoCode(`> do\n${condition.substring(1)}`);
        if(r.error){
            return {
                endIndex:r.endIndex,
                error:r.error
            }
        }
        cond=r.result?.[0]?.fn?.body;
    }


    return {
        endIndex,
        result:{
            eventName,
            role,
            fnName,
            condition: cond
        }
    }

}


const optionsSplit=/[\*\+, \t!]+/;
const promptStringParamsReg=/^\s*\(([^)]*)\)/s;
const lastReg=/last\s*:\s*(\d+)/;
const dropLastReg=/drop\s*:\s*(\d+)/;
const hasMsgReg=/(^|\n)\s*>/;
const jsonReg=/json\s*:\s*(\w+)(\[\s*\])?/;
const assignReg=/(\w+)\s*=/;
const wrapTagReg=/\/(\w+)/;
const taskReg=/(^|\s*)task\s*:\s*(.*)/;
export const parseInlineConvoPrompt=(
    content:string|ConvoStatement,
    options?:InlineConvoParsingOptions,
):CodeParsingResult<InlineConvoPrompt>=>{

    let statement:ConvoStatement|undefined;
    if(typeof content === 'object'){
        statement=content;
        const headStr=(typeof content.value ==='string')?content.value:content.params?.[0]?.value;
        if(typeof headStr === 'string'){
            content=headStr
        }else{
            content='';
        }
    }

    const paramsMatch=promptStringParamsReg.exec(content);
    let header=paramsMatch?.[1];
    const originalHeader=header;

    let task:string|undefined;
    if(header){
        const taskMatch=taskReg.exec(header);
        if(taskMatch){
            task=taskMatch[2];
            header=header.substring(0,taskMatch.index)
        }
    }
    const headOptions=header?.split(optionsSplit);
    if(paramsMatch){
        content=content.substring(paramsMatch[0].length+1).trim();
    }else{
        content=content.trim();
    }

    let wrap=header?wrapTagReg.exec(header)?.[1]:undefined;
    let standardPrompt:StandardConvoSystemMessage|undefined;
    if(wrap==='m'){
        wrap='moderator';
        standardPrompt='moderatorTags';
    }else if(wrap==='u'){
        wrap='user';
        standardPrompt='userTags';
    }else if(wrap==='a'){
        wrap='assistant';
        standardPrompt='assistantTags';
    }

    const hasRole=hasMsgReg.test(content);

    if(!hasRole && wrap && (options?.isStatic?!statement?.params:true)){
        if(options?.isStatic && statement?.params){//
            content=`<${wrap}>\n${content}`;
            const close=`\n</${wrap}>`;
            statement.params.push({
                s:0,
                e:0,
                source:close,
                value:close
            });
        }else{
            content=`<${wrap}>\n${content}\n</${wrap}>`
        }
    }

    const extend=header?.includes('*');
    const _continue=header?.includes('+');

    let messages:ConvoMessage[];
    let endIndex=0;
    const jsonMatch=header?jsonReg.exec(header):undefined
    const jsonType=jsonMatch?.[1]||(headOptions?.includes('boolean')?'TrueFalse':undefined);
    const jsonAry=jsonMatch?.[2]?true:undefined;

    if(!options?.isStatic){
        if(!hasRole && !options?.isStatic){
            content=`> ${extend||_continue?'suffix':'user'}\n${content}`;
        }
        const parsed=parseConvoCode(content,options);
        if(parsed.error){
            return {
                endIndex:parsed.endIndex,
                error:parsed.error,
            }
        }
        messages=parsed.result??[];
        endIndex=parsed.endIndex;
        const last=messages[messages.length-1];
        if(last && jsonType){
            if(!last.tags){
                last.tags=[];
            }
            last.tags.push({name:'json',value:jsonType+(jsonAry?'[]':'')})
        }
    }else if(statement){
        messages=[];
        if(options.applyToStatement){
            if(typeof statement.value==='string'){
                statement.value=content;
            }
            if(statement.params){
                const first=statement.params[0];
                if(typeof first?.value === 'string'){
                    if(!content){
                        statement.params?.shift();
                    }else{
                        first.value=content;

                    }
                }
            }
        }
    }else{
        return {
            error:getCodeParsingError(content,0,''),
            endIndex:0,
        }
    }

    if(statement?.tags){
        for(const msg of messages){
            if(!msg.tags){
                msg.tags=[];
            }
            msg.tags.push(...statement.tags.map(t=>deepClone(t)))
        }
    }

    return {
        endIndex,
        result:{
            header:originalHeader??'',
            extend,
            continue:_continue,
            system:headOptions?.includes('system'),
            functions:headOptions?.includes('functions'),
            transforms:headOptions?.includes('transforms'),
            last:header?safeParseNumberOrUndefined(lastReg.exec(header)?.[1]):undefined,
            dropLast:header?safeParseNumberOrUndefined(dropLastReg.exec(header)?.[1]):undefined,
            not:header?.includes('!'),
            messages,
            hasRole,
            action:header?getConvoMessageModificationAction(header):undefined,
            appendOutput:headOptions?.includes('>>'),
            assignOutputTo:header?assignReg.exec(header)?.[1]:undefined,
            wrapInTag:wrap,
            systemMessages:standardPrompt?[standardPrompt]:undefined,
            isStatic:options?.isStatic,
            jsonType,
            jsonAry,
            task:task?{name:task}:undefined,
            tags:statement?.tags?deepClone(statement.tags):undefined,
        },
    }
}

export const doesConvoContentHaveMessage=(content:string):boolean=>{
    return hasMsgReg.test(content);
}

/**
 * Parses a ConvoImportMatchThe match value can use wild cards are be a regular expression.
 * Regular expressions start with a (!) followed by a space then the regular expression pattern.
 *
 *  * @example // By path
 * ./company-policies.md
 *
 * @example // wildcard
 * *policies.md
 *
 * @example // regular expression
 * ! policies\.(md|mdx)$
 */
export const parseConvoImportMatch=(value:string):CodeParsingResult<ConvoImportMatch>=>{
    if(value.startsWith('!')){
        try{
            const pattern=value.substring(1).trim();
            return {
                endIndex:value.length,
                result:{
                    pattern,
                    [convoImportMatchRegKey]:new RegExp(pattern)
                }
            }
        }catch(ex){
            return {
                endIndex:0,
                error:getCodeParsingError(value,0,`Invalid regex pattern: ${getErrorMessage(ex)}`),
            }
        }
    }else if(value.includes('*')){
        try{
            return {
                endIndex:value.length,
                result:{
                    path:value,
                    [convoImportMatchRegKey]:starStringToRegex(value)
                }
            }
        }catch(ex){
            return {
                endIndex:0,
                error:getCodeParsingError(value,0,`Invalid wildcard pattern: ${getErrorMessage(ex)}`),
            }
        }
    }else{
        return {
            endIndex:value.length,
            result:{
                path:value,
            }
        }
    }
}
