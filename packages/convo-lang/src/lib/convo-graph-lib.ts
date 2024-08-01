import { ZodType } from "zod";
import { Conversation, ConversationOptions } from "./Conversation";
import { ConvoGraphDb, ConvoMetadataAndTypeMap, ConvoNode, ConvoNodeExecCtx, ConvoNodeMetadata, ConvoNodeOutput, IHasConvoGraphDb } from "./convo-graph-types";
import { convoTags } from "./convo-lib";

export const getConvoNodeMetadataAsync=async (convo:Conversation|null):Promise<ConvoMetadataAndTypeMap>=>{

    const outputTypes:ConvoNodeOutput[]=[];
    const metadata:ConvoNodeMetadata={outputTypes}
    const typeMap:Record<string,ZodType<any>>={}

    if(!convo){
        return {metadata,typeMap};
    }

    try{
        const flat=await convo.getLastAutoFlatAsync();

        if(!flat){
            return {metadata,typeMap}
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
    }catch(ex){
        console.warn('Creating ConvoMetadataAndTypeMap failed. This could be due to undefined vars in the last step of a node',ex)
    }

    return {metadata,typeMap}
}

export const createConvoNodeExecCtxAsync=async (node:ConvoNode,convoOptions?:ConversationOptions):Promise<ConvoNodeExecCtx>=>{

    const defaultVars={
        ...convoOptions?.defaultVars
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
        steps:node.steps.map((step,i)=>({
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
