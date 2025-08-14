import { Conversation, ConversationOptions, convoTags, ConvoTokenUsage, convoUsageTokensToString } from "@convo-lang/convo-lang";
import { getErrorMessage, joinPaths, uiRouterService } from "@iyio/common";
import { ZodType } from "zod";
import { ConvoGraphDb, ConvoGraphEntities, ConvoGraphEntityRef, ConvoGraphMonitorEvent, ConvoGraphSelection, ConvoMetadataAndTypeMap, ConvoNode, ConvoNodeExecCtx, ConvoNodeMetadata, ConvoNodeOutput, ConvoStateVarProxyMap, ConvoTraverser, IHasConvoGraphDb } from "./convo-graph-types";

export const maxConvoGraphConcurrentStepExe=5;

export const convoTraverserStateStoreSuffix='_suffix';

export const convoTraverserProxyVar='_proxy';

export const defaultConvoGraphUserDataVarName='userData';

export const applyConvoTraverserControlPath=(tv:ConvoTraverser)=>{
    if(tv.controlPath){
        const suffix=tv.state[convoTraverserStateStoreSuffix];
        uiRouterService().replace(suffix?joinPaths(tv.controlPath,suffix):tv.controlPath);
    }
}

export const getConvoTraverserForSaving=(tv:ConvoTraverser):ConvoTraverser=>{
    const map=tv.state[convoTraverserProxyVar] as ConvoStateVarProxyMap|undefined;
    if(!map || (typeof map !=='object')){
        return tv;
    }
    tv={...tv};
    tv.state={...tv.state};
    for(const e in map){
        delete tv.state[e];
    }
    return tv;
}

export const getConvoTraverserStoreId=(tv:ConvoTraverser,ext?:string):string=>{
    const suffix=tv.state?.[convoTraverserStateStoreSuffix];
    return getConvoTraverserStoreIdById(tv.id,suffix,ext);
}
export const getConvoTraverserStoreIdById=(id:string,storeSuffix?:string,ext?:string):string=>{
    id=storeSuffix?id+'-'+storeSuffix:id;
    if(ext && !id.endsWith(ext)){
        id+=ext;
    }
    return id;
}

export const getConvoNodeMetadataAsync=async (convo:Conversation|null):Promise<ConvoMetadataAndTypeMap>=>{

    const outputTypes:ConvoNodeOutput[]=[];
    const metadata:ConvoNodeMetadata={outputTypes}
    const typeMap:Record<string,ZodType<any>>={}
    let sharedVars:Record<string,any>|undefined;

    if(!convo){
        return {metadata,typeMap,sharedVars:{}};
    }

    try{
        const flat=await convo.getLastAutoFlatAsync();

        if(!flat){
            return {metadata,typeMap,sharedVars:{}}
        }

        const inputVar=flat.exe.getVarAsType('Input');

        if(inputVar){
            metadata.inputType={name:'Input'}
            typeMap['Input']=inputVar;
        }


        for(const msg of flat.messages){
            if( msg.tags &&
                (convoTags.output in msg.tags) &&
                msg.fn?.returnType
            ){
                const outputVar=flat.exe.getVarAsType(msg.fn.returnType);
                if(outputVar){
                    const output:ConvoNodeOutput={
                        name:msg.fn.returnType,
                        fnName:msg.fn.name,
                    }
                    outputTypes.push(output);
                }
            }
        }

        if(!outputTypes.length && inputVar){
            outputTypes.push({
                name:'Input'
            })
        }

        sharedVars=flat.exe.getUserSharedVarsExcludeTypes();
    }catch(ex){
        console.warn('Creating ConvoMetadataAndTypeMap failed. This could be due to undefined vars in the last step of a node',ex)
    }

    return {metadata,typeMap,sharedVars:sharedVars??{}}
}

export const createConvoNodeExecCtxAsync=async (node:ConvoNode,convoOptions?:ConversationOptions):Promise<ConvoNodeExecCtx>=>{

    const defaultVars={
        ...convoOptions?.defaultVars
    }

    if(node.userData){
        const varName=node.userDataVarName===undefined?defaultConvoGraphUserDataVarName:node.userDataVarName;
        if(varName && defaultVars[varName]===undefined){
            defaultVars[varName]={...node.userData}
        }
    }

    const metadataAndMap=await getConvoNodeMetadataAsync((node.sharedConvo || node.steps.length)?
        createConvoNodeExecCtxConvo(node,defaultVars,convoOptions,(node.steps[node.steps.length-1]?.convo??'')):
        null
    );

    return {
        ...metadataAndMap,
        node,
        defaultVars,
        convo:createConvoNodeExecCtxConvo(node,defaultVars,convoOptions),
        steps:node.steps.map((step)=>({
            nodeStep:step,
        }))
    }
}

export const resetConvoNodeExecCtxConvo=(ctx:ConvoNodeExecCtx)=>{
    ctx.convo=createConvoNodeExecCtxConvo(ctx.node,ctx.defaultVars,ctx.convoOptions)
}

export const createConvoNodeExecCtxConvo=(
    node:ConvoNode,
    defaultVars:Record<string,any>,
    convoOptions?:ConversationOptions,
    appendConvo:string=''
):Conversation=>{
    return new Conversation({
        ...convoOptions,
        defaultVars,
        initConvo:(
            (convoOptions?.initConvo?convoOptions?.initConvo+'\n\n':'')+
            (node.sharedConvo?node.sharedConvo+'\n\n':'')+
            appendConvo
        )
    })
}

export const hasConvoGraphDb=(obj:any):obj is IHasConvoGraphDb=>{
    return (
        obj &&
        (typeof obj === 'object') &&
        (Array.isArray((obj as IHasConvoGraphDb).db?.nodes)) &&
        (Array.isArray((obj as IHasConvoGraphDb).db?.edges)) &&
        (Array.isArray((obj as IHasConvoGraphDb).db?.traversers))
    )?true:false
}

export const fixConvoGraphDb=(db:ConvoGraphDb):boolean=>{
    let changes=false;
    if(!db.edges){
        db.edges=[];
        changes=true;
    }
    if(!db.nodes){
        db.nodes=[];
        changes=true;
    }
    if(!db.traversers){
        db.traversers=[];
        changes=true;
    }
    if(!db.inputs){
        db.inputs=[];
        changes=true;
    }
    if(!db.sourceNodes){
        db.sourceNodes=[];
        changes=true;
    }
    return changes;
}

export const createEmptyConvoGraphDb=():ConvoGraphDb=>{
    return {
        nodes:[],
        edges:[],
        traversers:[],
        inputs:[],
        sourceNodes:[],
    }
}

export const roundConvoGraphLayoutProps=(db:Partial<ConvoGraphDb>)=>{
    roundLayoutItems(db.nodes);
    roundLayoutItems(db.edges);
    roundLayoutItems(db.inputs);
    roundLayoutItems(db.sourceNodes);
    roundLayoutItems(db.traversers);
}

const roundLayoutItems=(items:{x?:number,y?:number}[]|null|undefined)=>{
    if(!items){
        return;
    }
    for(const i of items){
        if(i.x!==undefined){
            i.x=Math.round(i.x);
        }
        if(i.y!==undefined){
            i.y=Math.round(i.y);
        }
    }
}

export const createConvoGraphEntity=(entities:ConvoGraphEntities):ConvoGraphEntityRef|undefined=>{
    if(entities.node){
        return {
            type:'node',
            id:entities.node.id,
            entity:entities.node,
            ...entities
        }
    }else if(entities.edge){
        return {
            type:'edge',
            id:entities.edge.id,
            entity:entities.edge,
            ...entities
        }
    }else if(entities.input){
        return {
            type:'input',
            id:entities.input.id,
            entity:entities.input,
            ...entities
        }
    }else if(entities.source){
        return {
            type:'source',
            id:entities.source.id,
            entity:entities.source,
            ...entities
        }
    }else if(entities.traverser){
        return {
            type:'traverser',
            id:entities.traverser.id,
            entity:entities.traverser,
            ...entities
        }
    }else{
        return undefined;
    }
}

export const compareConvoGraphSelections=(a:ConvoGraphSelection|null|undefined,b:ConvoGraphSelection|null|undefined)=>{
    if(a===b){
        return true;
    }
    if(!a || !b){
        return false;
    }

    if(a.id!==b.id || a.multi.length!==b.multi.length){
        return false;
    }

    for(let i=0;i<a.multi.length;i++){
        const sa=a.multi[i];
        const sb=b.multi[i];
        if(sa?.id!==sb?.id){
            return false;
        }
    }

    return true;
}

export const getConvoGraphEventString=(e:ConvoGraphMonitorEvent,usage?:ConvoTokenUsage):string=>{
    try{
        return (
            `${e.type} / ${e.traverser?.exeState} - ${e.text} - \npayload:${
                JSON.stringify(e.traverser?.payload??null,null,4)
            }\nstate:${
                JSON.stringify(e.traverser?.state??null,null,4)
            }${
                e.node?.userData?`\nuserData:${JSON.stringify(e.node.userData,null,4)}`:''
            }${
                usage?`\nusage: ${convoUsageTokensToString(usage)}`:''
            }`
        )
    }catch(ex){
        return (
            `${e.type} / ${e.traverser?.exeState} - ${e.text} - \njsonStringifyError:${
                getErrorMessage(ex)
            }${
                usage?`\nusage: ${convoUsageTokensToString(usage)}`:''
            }`
        )
    }
}
