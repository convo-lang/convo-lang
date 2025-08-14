import { escapeConvoMessageContent, escapeConvoTagValue } from "@convo-lang/convo-lang";
import { createJsonRefReplacer, setIndentation } from "@iyio/common";
import { ConvoEdge, ConvoGraphDb, ConvoInputTemplate, ConvoNode, ConvoNodeStep } from "./convo-graph-types";

export const convoGraphToConvo=(db:Partial<ConvoGraphDb>):string=>{

    const out:string[]=[];

    const tab='';

    if(db.metadata){
        out.push('> graph\n``` json\n');
        out.push(JSON.stringify(db.metadata,createJsonRefReplacer(),4));
        out.push('\n```\n');
    }

    if(db.nodes){
        for(const node of db.nodes){
            writeNode(node,out,tab);
        }
    }

    if(db.edges){
        for(const edge of db.edges){
            writeEdge(edge,out,tab);
        }
    }

    if(db.inputs){
        for(const input of db.inputs){
            writeInput(input,out,tab);
        }
    }


    return out.join('');

}

const writeNode=(node:ConvoNode,out:string[],tab:string)=>{
    const isName=nameReg.test(node.key??'');
    if(out.length){
        out.push('\n\n');
    }
    out.push(`${tab}> node ${isName?node.key:''}(`);
    for(const e in node){
        const value=(node as any)[e];
        if(value===undefined){
            continue;
        }
        switch(e as keyof ConvoNode){

            case 'key':
                if(!isName){
                    out.push(` ${e}: ${JSON.stringify(value)}`)
                }
                break;

            case 'sharedConvo':
            case 'steps':
                break;

            default:
                out.push(` ${e}: ${JSON.stringify(value)}`);
                break;

        }
    }

    out.push(' )\n\n');

    tab+='    ';

    if(node.sharedConvo){
        out.push(setIndentation(tab.length,node.sharedConvo));
        out.push('\n\n');
    }

    for(const step of node.steps){
        writeStep(step,out,tab)
    }
}

const writeStep=(step:ConvoNodeStep,out:string[],tab:string)=>{
    out.push(`${tab}> step (`);
    for(const e in step){
        const value=(step as any)[e];
        if(value===undefined){
            continue;
        }
        switch(e as keyof ConvoNodeStep){

            case 'convo':
                break;

            default:
                out.push(` ${e}: ${JSON.stringify(value)}`);
                break;

        }
    }

    out.push(' )\n');

    tab+='    ';

    if(step.convo){
        out.push('\n');
        out.push(setIndentation(tab.length,step.convo));
        out.push('\n\n');
    }
}

const writeEdge=(edge:ConvoEdge,out:string[],tab:string)=>{
    const isFromName=nameReg.test(edge.from??'');
    const isToName=nameReg.test(edge.to??'');
    if(out.length){
        out.push('\n\n');
    }
    out.push(`${tab}> edge ${isFromName?edge.from:''}(`);
    for(const e in edge){
        const value=(edge as any)[e];
        if(value===undefined){
            continue;
        }
        switch(e as keyof ConvoEdge){

            case 'from':
                if(!isFromName){
                    out.push(` ${tab}${e}: ${JSON.stringify(value)}`)
                }
                break;

            case 'to':
                if(!isToName){
                    out.push(` ${tab}${e}: ${JSON.stringify(value)}`)
                }
                break;


            case 'conditionConvo':
                break;

            default:
                out.push(` ${tab}${e}: ${JSON.stringify(value)}`);
                break;

        }
    }

    out.push(` ) -> ${isToName?` ${edge.to}`:''}`);

    if(edge.conditionConvo){
        out.push(' (\n');
        out.push(setIndentation(tab.length+4,edge.conditionConvo));
        out.push(`\n${tab})\n`)
    }else{
        out.push('()\n')
    }
}

const writeInput=(input:ConvoInputTemplate,out:string[],tab:string)=>{
    if(out.length){
        out.push('\n\n');
    }

    for(const e in input){
        const value=(input as any)[e];
        if(value===undefined){
            continue;
        }
        switch(e as keyof ConvoInputTemplate){

            case 'value':

            case 'isJson':
                break;

            default:
                out.push(`${tab}@${e} ${escapeConvoTagValue(value?.toString()??'')}\n`);
                break;

        }
    }

    out.push(`${tab}> input\n`);
    if(input.value){
        if(input.isJson){
            out.push(`${tab}\`\`\` json\n`);
            out.push(escapeConvoMessageContent(input.value));
            out.push(`\n${tab}\`\`\``)
        }else{
            out.push(escapeConvoMessageContent(input.value));
            out.push('\n')
        }
    }

}

const nameReg=/^\w+$/
