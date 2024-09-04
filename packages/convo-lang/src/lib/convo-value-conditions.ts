import { ValueCondition, isValueConditionGroup, isValueConditionOp } from "@iyio/common";
export interface ValueConditionToConvoOptions
{
    allowEval?:boolean;
    defaultPath?:string;
    indent?:string;
    tab?:string;
    skipInitIndent?:boolean;
}

export const valueConditionToConvo=(value:ValueCondition,options:ValueConditionToConvoOptions):string=>{
    const out:string[]=[];
    _valueConditionToConvo(value,options,options.defaultPath??'',options.indent??'',out,0);
    return out.join('');
}
const _valueConditionToConvo=(
    value:ValueCondition,
    options:ValueConditionToConvoOptions,
    path:string,
    indent:string,
    out:string[],
    depth:number,
):void=>{
    if(depth>maxDepth){
        throw new Error(`valueConditionToConvo max depth reached - ${maxDepth}`)
    }
    if(options.tab && (out.length || !options.skipInitIndent)){
        out.push('\n',indent);
    }
    if(isValueConditionGroup(value)){
        if(!value.conditions.length){
            return;
        }else if(value.conditions.length===1){
            const first=value.conditions[0];
            if(first){

                // pop the newline and indent
                out.pop();
                out.pop();

                _valueConditionToConvo(first,options,joinPath(path,first.path),indent,out,depth+1);
            }
            return;
        }
        out.push(value.op,'(')
        for(let i=0;i<value.conditions.length;i++){
            const c=value.conditions[i];
            out.push(' ');
            if(c){
                _valueConditionToConvo(c,options,joinPath(path,c.path),indent+(options.tab??''),out,depth+1);
            }
        }
        if(options.tab){
            out.push('\n',indent)
        }else{
            if(out[out.length-1]!==' '){
                out.push(' ')
            }
        }
        out.push(')');
    }else{
        let close=true;
        let writeValue=true;
        let writePath=true;
        let op=value.op;
        let isNot=op.startsWith('not-');
        let pathFunc:string|undefined;
        let afterParams:string|undefined;
        if(isNot){
            const norm=op.substring(4);
            if(isValueConditionOp(norm)){
                op=norm;
                out.push('not(');
            }else{
                isNot=false;
            }
        }
        switch(value.op){

            case 'eq':
                out.push('eq(');
                break;

            case 'lt':
                out.push('lt(');
                break;

            case 'lte':
                out.push('lte(');
                break;

            case 'gt':
                out.push('tg(');
                break;

            case 'gte':
                out.push('gte(');
                break;

            case 'in':
                out.push('isIn(');
                break;

            case 'contains':
                out.push('contains(');
                break;

            case 'starts-with':
                pathFunc='startsWith';
                close=false;
                break;

            case 'ends-with':
                pathFunc='endsWith';
                close=false;
                break;

            case 'match':
                out.push('regexMatch(');
                break;

            case 'star-match':
                out.push('starMatch(');
                break;

            case 'obj-eq':
                out.push('deepCompare(');
                break;

            case 'obj-in':
                out.push('deepCompare(');
                afterParams='{ignoreExtraBKeys:true}';
                break;

            case 'no-op':
                close=false;
                writePath=false;
                break;

            default:
                close=false;
                writeValue=false;
                writePath=false;
                break;

        }

        if(writePath){
            out.push(joinPath(path,value.path));
            if(pathFunc){
                out.push('.',pathFunc,'(');
            }
            out.push(' ')
        }

        if(writeValue){
            if(value.evalValue){
                if(options.allowEval){
                    out.push((typeof value.value === 'string')?value.value:(value.value?.toString()??''));
                }else{
                    out.push('false');
                }
            }else{
                out.push(JSON.stringify(value.value??null));
            }
        }

        if(writePath && pathFunc){
            out.push(')');
        }

        if(afterParams){
            out.push(' ',afterParams);
        }

        if(close){
            out.push(')');
        }

        if(isNot){
            out.push(')');
        }
    }
}


const maxDepth=100;

const joinPath=(base:string,path:string|null|undefined)=>{
    if(!path){
        return base;
    }else if(!base){
        return path;
    }else{
        return base+'.'+path;
    }
}
