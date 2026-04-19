'use strict';

export type StringMode='dq'|'sq'|'inline'|'heredoc'|'prompt'|'embed';

export type RoleContext='none'|'content'|'script'|'function'|'special';

export interface ConvoState
{
    stringMode:StringMode|null;
    stringReturnMode:StringMode|null;
    afterGt:boolean;
    roleContext:RoleContext;
    parenDepth:number;
    braceDepth:number;
    lastTag:string|null;
    inEmbedBraces:number;
    headerConsumed:boolean;
}

export interface CodeMirrorStream
{
    pos:number;
    string:string;
    start:number;
    eol():boolean;
    sol():boolean;
    peek():string|undefined;
    next():string|undefined;
    match(pattern:string|RegExp,consume?:boolean,caseInsensitive?:boolean):any;
    skipToEnd():void;
    current():string;
    backUp(n:number):void;
}

export interface CodeMirrorMode
{
    startState():ConvoState;
    copyState?(state:ConvoState):ConvoState;
    token(stream:CodeMirrorStream,state:ConvoState):string|null;
}

export interface CodeMirrorApi
{
    modes:Record<string,unknown>;
    defineMode(name:string,factory:()=>CodeMirrorMode):void;
    defineMIME?:(mime:string,mode:string)=>void;
}

const wordRe=/[A-Za-z0-9_]/;

const scriptRoles=new Set([
    'do','thinkingResult','result','define','debug','end',
    'target','make','stage','app',
]);

const controlFlowStatements=new Set([
    'parallelEnd','parallel','insertEnd','agentEnd','queue','flush',
]);

const specialContentRoles=new Set([
    'nodeEnd','node','goto','exitGraph',
]);

const routeRoles=new Set([
    'exit','to','from',
]);

const functionModifiers=new Set([
    'agent','public','local',
]);

const systemFunctions=new Set([
    'elif','if','else','while','break','foreach','for','in','do',
    'outInline','outTrim','out','then','fn','return','case','default','switch','test',
]);

const operatorFunctions=new Set([
    'lt','lte','neq','eq','gt','gte','is','add','sub','mul','div',
    'not','mod','pow','inc','dec','no',
]);

const logicFunctions=new Set([
    'and','or',
]);

const typeFunctions=new Set([
    'enum','struct','array',
]);

const typeKeywords=new Set([
    'string','number','int','boolean','time','void','any','map','array','object',
]);

const constValues=new Set([
    'true','false','null','undefined','convo',
    '__args','__return','__error','__debug',
    '__disableAutoComplete','__file','__cwd',
]);

const conditionTags=new Set([
    '@condition','@disabled','@taskName','@taskDescription',
]);

const typeValueTags=new Set([
    '@json','@inputConversation','@inputType',
]);

const keywordTags=new Set([
    '@exit','@to','@from','@import','@name',
    '@routeTo','@routeFrom','@importMatch',
    '@on','@messageHandler','@dep','@block','@messageHandlerHeadProp',
]);

function isWord(ch:string|undefined):boolean
{
    return !!ch && wordRe.test(ch);
}

function skipSpaces(stream:CodeMirrorStream):void
{
    while(!stream.eol()){
        const ch=stream.peek();
        if(!ch || !/[ \t]/.test(ch)){
            break;
        }
        stream.next();
    }
}

function readWord(stream:CodeMirrorStream):string
{
    let value='';
    while(!stream.eol() && isWord(stream.peek())){
        value+=stream.next()??'';
    }
    return value;
}

function copyState(state:ConvoState):ConvoState
{
    return {
        stringMode:state.stringMode,
        stringReturnMode:state.stringReturnMode,
        afterGt:state.afterGt,
        roleContext:state.roleContext,
        parenDepth:state.parenDepth,
        braceDepth:state.braceDepth,
        lastTag:state.lastTag,
        inEmbedBraces:state.inEmbedBraces,
        headerConsumed:state.headerConsumed,
    };
}

function tokenQuotedString(
    stream:CodeMirrorStream,
    state:ConvoState,
    quote:'"'|"'"
):string
{
    let escaped=false;
    while(!stream.eol()){
        if(!escaped && quote==="'" && stream.match('{{',false)){
            stream.match('{{');
            state.stringReturnMode=state.stringMode;
            state.stringMode=null;
            state.inEmbedBraces++;
            return 'tag';
        }
        const ch=stream.next();
        if(escaped){
            escaped=false;
            continue;
        }
        if(ch==='\\'){
            escaped=true;
            continue;
        }
        if(ch===quote){
            state.stringMode=null;
            return 'string';
        }
    }
    return 'string';
}

function tokenInlineCode(stream:CodeMirrorStream,state:ConvoState):string
{
    while(!stream.eol()){
        const ch=stream.next();
        if(ch==='`'){
            state.stringMode=null;
            break;
        }
    }
    return 'string-2';
}

function tokenHeredoc(stream:CodeMirrorStream,state:ConvoState):string|null
{
    if(stream.match(/-{3,}/)){
        state.stringMode=null;
        return 'comment';
    }
    stream.skipToEnd();
    return 'string';
}

function tokenPromptOrEmbed(
    stream:CodeMirrorStream,
    state:ConvoState,
    closer:'???'|'==='
):string|null
{
    if(stream.match(closer)){
        state.stringMode=null;
        return 'keyword';
    }
    stream.next();
    return 'string';
}

function tokenStringMode(stream:CodeMirrorStream,state:ConvoState):string|null
{
    switch(state.stringMode){
        case 'dq':
            return tokenQuotedString(stream,state,'"');
        case 'sq':
            return tokenQuotedString(stream,state,"'");
        case 'inline':
            return tokenInlineCode(stream,state);
        case 'heredoc':
            return tokenHeredoc(stream,state);
        case 'prompt':
            return tokenPromptOrEmbed(stream,state,'???');
        case 'embed':
            return tokenPromptOrEmbed(stream,state,'===');
        default:
            return null;
    }
}

function maybeEnterStringModsFromPrefix(stream:CodeMirrorStream):boolean
{
    const pos=stream.pos;
    skipSpaces(stream);
    if(stream.peek()==='('){
        return true;
    }
    stream.pos=pos;
    return false;
}

function tokenLineStart(stream:CodeMirrorStream,state:ConvoState):string|null
{
    if(stream.match(/[ \t]*#.*/)){
        return 'comment';
    }
    if(stream.match(/[ \t]*\/\/.*/)){
        return 'comment';
    }

    const savedPos=stream.pos;
    skipSpaces(stream);

    if(stream.peek()==='>'){
        stream.next();
        state.afterGt=true;
        state.lastTag=null;
        state.headerConsumed=false;
        return 'keyword';
    }

    if(stream.peek()==='@'){
        stream.next();
        const tag='@'+readWord(stream);
        state.lastTag=tag;
        if(
            conditionTags.has(tag) ||
            typeValueTags.has(tag) ||
            keywordTags.has(tag)
        ){
            return 'keyword';
        }
        return 'attribute';
    }

    stream.pos=savedPos;
    return null;
}

function tokenAfterGt(stream:CodeMirrorStream,state:ConvoState):string|null
{
    skipSpaces(stream);
    if(stream.eol()){
        state.afterGt=false;
        return null;
    }

    const start=stream.pos;
    const word=readWord(stream);

    if(!word){
        stream.next();
        state.afterGt=false;
        state.roleContext='content';
        return null;
    }

    state.afterGt=false;

    if(word==='thinking'){
        state.roleContext='script';
        return 'def';
    }

    if(word==='insert'){
        state.roleContext='script';
        return 'keyword';
    }

    if(word==='nop' || word==='template' || word==='templateEnd'){
        state.roleContext='content';
        return 'def';
    }

    if(specialContentRoles.has(word)){
        state.roleContext='special';
        return 'keyword';
    }

    if(routeRoles.has(word)){
        state.roleContext='special';
        return 'def';
    }

    if(controlFlowStatements.has(word)){
        state.roleContext='none';
        return 'keyword';
    }

    if(scriptRoles.has(word)){
        state.roleContext='script';
        return 'keyword';
    }

    if(functionModifiers.has(word)){
        state.roleContext='function';
        return 'keyword';
    }

    const save=stream.pos;
    skipSpaces(stream);
    const nextWord=readWord(stream);
    skipSpaces(stream);
    if(nextWord && (stream.peek()==='(' || stream.peek()==='*' || stream.peek()==='?' || stream.peek()==='!')){
        stream.pos=start+word.length;
        state.roleContext='function';
        return 'keyword';
    }
    stream.pos=save;

    state.roleContext='content';
    return 'atom';
}

function tokenTagRequiredExpression(stream:CodeMirrorStream,state:ConvoState):string|null
{
    skipSpaces(stream);
    if(stream.peek()==='='){
        stream.next();
        state.lastTag='__expr__';
        return 'operator';
    }
    if(!stream.eol()){
        stream.skipToEnd();
        return 'error';
    }
    return null;
}

function tokenTagOptionalExpression(stream:CodeMirrorStream,state:ConvoState):string|null
{
    skipSpaces(stream);
    if(stream.peek()==='='){
        stream.next();
        state.lastTag='__expr__';
        return 'operator';
    }
    stream.skipToEnd();
    return 'string';
}

function tokenTypeExpression(stream:CodeMirrorStream,state:ConvoState):string|null
{
    skipSpaces(stream);
    if(stream.eol()){
        return null;
    }
    const word=readWord(stream);
    if(word){
        if(typeFunctions.has(word) && stream.peek()==='('){
            return 'type';
        }
        if(typeKeywords.has(word)){
            return 'type';
        }
        if(/^[A-Z_]/.test(word)){
            if(stream.match(/\[\s*\]/)){
                return 'type';
            }
            return 'type';
        }
        return 'variable';
    }
    stream.next();
    return null;
}

function tokenTagValue(stream:CodeMirrorStream,state:ConvoState):string|null
{
    const tag=state.lastTag;
    if(!tag){
        return null;
    }

    if(stream.sol()){
        state.lastTag=null;
        state.headerConsumed=false;
        return null;
    }

    if(tag==='@importMatch'){
        if(!state.headerConsumed){
            skipSpaces(stream);
            if(stream.match('!')){
                state.headerConsumed=true;
                return 'def';
            }
            state.headerConsumed=true;
        }
        stream.skipToEnd();
        return 'string-2';
    }

    if(tag==='@import'){
        skipSpaces(stream);
        if(stream.match(/as\b/)){
            return 'keyword';
        }
        const ch=stream.peek();
        if(ch==='!'){
            stream.next();
            readWord(stream);
            if(stream.match(':')){
                readWord(stream);
            }
            return 'def';
        }
        const word=readWord(stream);
        if(word){
            return 'variable';
        }
        stream.next();
        return 'string';
    }

    if(tag==='@name'){
        skipSpaces(stream);
        if(!state.headerConsumed){
            const word=readWord(stream);
            if(word){
                state.headerConsumed=true;
                return 'variable';
            }
        }
        stream.skipToEnd();
        return 'error';
    }

    if(tag==='@on'){
        skipSpaces(stream);
        if(!state.headerConsumed){
            const word=readWord(stream);
            if(word){
                state.headerConsumed=true;
                if(word==='user' || word==='assistant'){
                    return 'type';
                }
                return 'variable';
            }
        }
        return tokenTagRequiredExpression(stream,state);
    }

    if(tag==='@messageHandler'){
        skipSpaces(stream);
        const word=readWord(stream);
        if(word){
            return 'keyword';
        }
        stream.next();
        return 'error';
    }

    if(tag==='@dep' || tag==='@block' || tag==='@messageHandlerHeadProp'){
        skipSpaces(stream);
        const word=readWord(stream);
        if(word){
            return 'variable';
        }
        stream.next();
        return 'error';
    }

    if(tag==='@routeTo' || tag==='@routeFrom'){
        skipSpaces(stream);
        if(!state.headerConsumed){
            const word=readWord(stream);
            if(word){
                state.headerConsumed=true;
                return 'variable';
            }
        }
        return tokenTagRequiredExpression(stream,state);
    }

    if(tag==='@exit'){
        skipSpaces(stream);
        if(stream.match(/else\b/)){
            return 'keyword';
        }
        return tokenTagOptionalExpression(stream,state);
    }

    if(tag==='@to' || tag==='@from'){
        skipSpaces(stream);
        if(!state.headerConsumed){
            if(stream.match(/\b(auto|next)\b/)){
                state.headerConsumed=true;
                return 'keyword';
            }
            const word=readWord(stream);
            if(word){
                state.headerConsumed=true;
                return 'variable';
            }
        }
        if(stream.match(/else\b/)){
            return 'keyword';
        }
        return tokenTagOptionalExpression(stream,state);
    }

    if(conditionTags.has(tag)){
        return tokenTagOptionalExpression(stream,state);
    }

    if(typeValueTags.has(tag)){
        return tokenTypeExpression(stream,state);
    }

    skipSpaces(stream);
    if(stream.peek()==='='){
        stream.next();
        state.lastTag='__expr__';
        return 'error';
    }
    stream.skipToEnd();
    return 'string';
}

function tokenSpecialWord(stream:CodeMirrorStream):string|null
{
    if(stream.match(/\$\$(RAG|CONTENT|CHILD|CHILDREN|SLOT_\w+)\$\$/)){
        return 'keyword';
    }
    return null;
}

function tokenXml(stream:CodeMirrorStream):string|null
{
    if(stream.match(/<\/?[\w-]+[^>]*?\/?>/)){
        return 'tag';
    }
    return null;
}

function tokenMarkdownLink(stream:CodeMirrorStream):string|null
{
    if(stream.match(/!?\[[^\]]*\]\([^)]*\)/)){
        return 'link';
    }
    return null;
}

function tokenNumber(stream:CodeMirrorStream,ch:string|undefined):string|null
{
    if(ch===undefined){
        return null;
    }
    if(/[0-9]/.test(ch) || (ch==='-' && /[0-9]/.test(stream.string.charAt(stream.pos+1)))){
        stream.match(/-?(\d+\.\d+|\.\d+|\d+)/);
        return 'number';
    }
    return null;
}

function tokenIdentifier(stream:CodeMirrorStream,state:ConvoState):string|null
{
    const word=readWord(stream);
    if(!word){
        return null;
    }

    if(typeKeywords.has(word)){
        return 'type';
    }

    if(constValues.has(word)){
        return 'atom';
    }

    const lookAhead=stream.peek();

    if(systemFunctions.has(word) && lookAhead==='('){
        return 'keyword';
    }
    if(operatorFunctions.has(word) && lookAhead==='('){
        return 'builtin';
    }
    if(logicFunctions.has(word) && lookAhead==='('){
        return 'keyword';
    }
    if(typeFunctions.has(word) && lookAhead==='('){
        return 'type';
    }

    if(lookAhead==='('){
        return 'def';
    }

    if(/^[A-Z]\w*$/.test(word)){
        return 'type';
    }

    if(lookAhead===':'){
        return 'property';
    }

    return 'variable';
}

function tokenExpression(stream:CodeMirrorStream,state:ConvoState):string|null
{
    skipSpaces(stream);

    if(stream.eol()){
        return null;
    }

    if(stream.match(/-{3,}/)){
        state.stringMode='heredoc';
        return 'comment';
    }

    if(stream.match('???',false)){
        stream.match('???');
        if(maybeEnterStringModsFromPrefix(stream)){
            stream.next();
        }
        state.stringMode='prompt';
        return 'keyword';
    }

    if(stream.match('===',false)){
        stream.match('===');
        if(maybeEnterStringModsFromPrefix(stream)){
            stream.next();
        }
        state.stringMode='embed';
        return 'keyword';
    }

    if(stream.match('{{')){
        state.inEmbedBraces++;
        return 'tag';
    }
    if(state.inEmbedBraces>0 && stream.match('}}')){
        state.inEmbedBraces--;
        if(state.stringReturnMode){
            state.stringMode=state.stringReturnMode;
            state.stringReturnMode=null;
        }
        return 'tag';
    }
    if(stream.match('\\{{')){
        return 'meta';
    }

    if(stream.match('->')){
        return 'keyword';
    }
    if(stream.match('<<')){
        return 'keyword';
    }

    const xml=tokenXml(stream);
    if(xml){
        return xml;
    }

    const link=tokenMarkdownLink(stream);
    if(link){
        return link;
    }

    const specialWord=tokenSpecialWord(stream);
    if(specialWord){
        return specialWord;
    }

    const ch=stream.peek();

    if(ch==='"'){
        stream.next();
        state.stringMode='dq';
        return 'string';
    }
    if(ch==="'"){
        stream.next();
        state.stringMode='sq';
        return 'string';
    }
    if(ch==='`'){
        stream.next();
        state.stringMode='inline';
        return 'string-2';
    }

    if(ch==='('){
        stream.next();
        state.parenDepth++;
        return 'bracket';
    }
    if(ch===')'){
        stream.next();
        if(state.parenDepth>0){
            state.parenDepth--;
        }
        return 'bracket';
    }
    if(ch==='{'){
        stream.next();
        state.braceDepth++;
        return 'bracket';
    }
    if(ch==='}'){
        stream.next();
        if(state.braceDepth>0){
            state.braceDepth--;
        }
        return 'bracket';
    }
    if(ch==='[' || ch===']' || ch===','){
        stream.next();
        return 'bracket';
    }
    if(ch==='=' || ch==='!' || ch==='<' || ch==='>' || ch==='+' || ch==='*' || ch==='/' || ch==='%' || ch==='|' || ch==='&'){
        stream.next();
        return 'operator';
    }
    if(ch===':'){
        stream.next();
        return 'operator';
    }

    const num=tokenNumber(stream,ch);
    if(num){
        return num;
    }

    if(ch && /[A-Za-z_]/.test(ch)){
        return tokenIdentifier(stream,state);
    }

    stream.next();
    return null;
}

function tokenContentBody(stream:CodeMirrorStream,state:ConvoState):string|null
{
    if(stream.eol()){
        return null;
    }

    if(stream.match('???',false)){
        stream.match('???');
        if(maybeEnterStringModsFromPrefix(stream)){
            stream.next();
        }
        state.stringMode='prompt';
        return 'keyword';
    }

    if(stream.match('===',false)){
        stream.match('===');
        if(maybeEnterStringModsFromPrefix(stream)){
            stream.next();
        }
        state.stringMode='embed';
        return 'keyword';
    }

    if(stream.match('{{')){
        state.inEmbedBraces++;
        return 'tag';
    }
    if(state.inEmbedBraces>0 && stream.match('}}')){
        state.inEmbedBraces--;
        if(state.stringReturnMode){
            state.stringMode=state.stringReturnMode;
            state.stringReturnMode=null;
        }
        return 'tag';
    }
    if(stream.match('\\{{')){
        return 'meta';
    }

    if(state.inEmbedBraces>0){
        return tokenExpression(stream,state);
    }

    const xml=tokenXml(stream);
    if(xml){
        return xml;
    }

    const link=tokenMarkdownLink(stream);
    if(link){
        return link;
    }

    const specialWord=tokenSpecialWord(stream);
    if(specialWord){
        return specialWord;
    }

    const ch=stream.peek();
    if(ch==='`'){
        stream.next();
        state.stringMode='inline';
        return 'string-2';
    }

    stream.next();
    return null;
}

function tokenMain(stream:CodeMirrorStream,state:ConvoState):string|null
{
    if(state.stringMode){
        const modeToken=tokenStringMode(stream,state);
        if(modeToken!==null){
            return modeToken;
        }
    }

    if(stream.sol()){
        state.inEmbedBraces=0;
        state.stringReturnMode=null;
        const lineToken=tokenLineStart(stream,state);
        if(lineToken){
            return lineToken;
        }
    }

    if(state.afterGt){
        return tokenAfterGt(stream,state);
    }

    if(state.lastTag && state.lastTag!=='__expr__'){
        const tagToken=tokenTagValue(stream,state);
        if(tagToken!==null){
            return tagToken;
        }
    }

    if(state.roleContext==='content' && state.inEmbedBraces===0){
        return tokenContentBody(stream,state);
    }

    return tokenExpression(stream,state);
}

export function createConvoMode():()=>CodeMirrorMode
{
    return function()
    {
        return {
            startState():ConvoState{
                return {
                    stringMode:null,
                    stringReturnMode:null,
                    afterGt:false,
                    roleContext:'content',
                    parenDepth:0,
                    braceDepth:0,
                    lastTag:null,
                    inEmbedBraces:0,
                    headerConsumed:false,
                };
            },
            copyState(state:ConvoState):ConvoState{
                return copyState(state);
            },
            token(stream:CodeMirrorStream,state:ConvoState):string|null{
                return tokenMain(stream,state);
            },
        };
    };
}

export function registerConvoMode():boolean
{
    const cm=(window as any).CodeMirror as CodeMirrorApi|undefined;
    if(!cm || !cm.defineMode){
        console.warn('Convo-Lang: CodeMirror not available');
        return false;
    }

    if(!cm.modes.convo){
        cm.defineMode('convo',createConvoMode());
    }

    if(cm.defineMIME){
        cm.defineMIME('text/x-convo','convo');
    }

    return true;
}
