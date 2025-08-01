import { JsonScheme, valueIsZodType, wordToSingular, zodTypeToJsonScheme } from "@iyio/common";
import { ZodType, ZodTypeAny, z } from "zod";
import { ConvoError } from "./ConvoError";
import { convoDescriptionToCommentOut, convoMetadataKey } from "./convo-lib";
import { ConvoBaseType, ConvoMetadata, OptionalConvoValue, isConvoBaseType, isConvoType, isOptionalConvoValue } from "./convo-types";

const typeCacheKey=Symbol('typeCacheKey');

export const convoTypeToJsonScheme=(value:any,maxDepth=100,cache=true):JsonScheme|undefined=>{
    const zod=convoValueToZodType(value,maxDepth,cache);
    return zodTypeToJsonScheme(zod,maxDepth,cache);
}

export const convoValueToZodType=(value:any,maxDepth=100,cache=true):ZodType<any>=>{
    if(cache && value && value[typeCacheKey]){
        return value[typeCacheKey];
    }
    const type=_convoValueToZodType(value,value?.[convoMetadataKey],maxDepth);
    if(cache && value){
        value[typeCacheKey]=type;
    }
    return type;
}

const _convoValueToZodType=(value:any,metadata:ConvoMetadata|undefined,maxDepth=100):ZodType<any>=>{

    maxDepth--;
    if(maxDepth<0){
        return z.any();
    }

    let isOptional=false;
    let isArray=false;
    if(isOptionalConvoValue(value)){
        isOptional=true;
        value=(value as OptionalConvoValue).value;
    }
    let zType:ZodType<any>;

    if(Array.isArray(value)){
        isArray=true;
        if(value.length===0){
            zType=z.any();
        }else{
            zType=_convoValueToZodType(value[0],undefined,maxDepth);
        }
    }else if(isConvoType(value)){
        if(isConvoBaseType(value.type)){
            zType=convoBaseTypeToZodType(value.type);
        }else if(value.enumValues){
            if(value.enumValues.length===0){
                zType=z.enum(['']);
            }else{
                let allStrings=true;
                for(let ei=0;ei<value.enumValues.length;ei++){
                    if(!(typeof value.enumValues[ei] === 'string')){
                        allStrings=false;
                        break;
                    }
                }
                if(allStrings){
                    zType=z.enum(value.enumValues as any);
                }else{
                    zType=z.union(value.enumValues.map(v=>z.literal(v)) as any);
                }
            }
        }else{
            zType=z.unknown();
        }
    }else{
        switch(value){
            case undefined: zType=z.undefined(); break;
            case null: zType=z.null(); break;
            default:
                if(typeof value === 'object'){
                    const shape=_convoParamsToZodShape(value,metadata,maxDepth);
                    zType=z.object(shape);
                }else{
                    zType=z.literal(value);
                }
        }
    }

    if(isArray){
        zType=zType.array();
    }

    if(isOptional){
        zType=zType.optional();
    }

    if(metadata?.comment){
        zType=zType.describe(metadata.comment);
    }

    return zType;

}

export const convoParamsToZodShape=(params:Record<string,any>,maxDepth=100):Record<string,ZodType<any>>=>{

    return _convoParamsToZodShape(params,undefined,maxDepth);
}

const _convoParamsToZodShape=(params:Record<string,any>,metadata:ConvoMetadata|undefined,maxDepth=100):Record<string,ZodType<any>>=>{

    maxDepth--;

    const shape:Record<string,ZodType<any>>={};

    for(const e in params){
        const v=params[e];
        shape[e]=_convoValueToZodType(v,metadata?.properties?.[e]??v?.[convoMetadataKey],maxDepth);
    }

    return shape;
}

export const convoBaseTypeToZodType=(type:ConvoBaseType):ZodType<any>=>{
    switch(type){
        case 'string': return z.string();
        case 'boolean': return z.boolean();
        case 'number': return z.number();
        case 'time': return z.number();
        case 'void': return z.void();
        case 'int': return z.number().int();
        case 'array': return z.any().array();
        case 'map': return z.record(z.string());
        case 'object': return z.record(z.any());
        case 'any': return z.any();
        default:
            throw new ConvoError(
                'unexpected-base-type',
                {baseType:type},
                `Unexpected ConvoBaseType - ${type}`
            );
    }
}

export const schemeToConvoTypeString=(scheme:ZodTypeAny|JsonScheme,nameOverride?:string):string=>{
    if(valueIsZodType(scheme)){
        const json=zodTypeToJsonScheme(scheme);
        if(!json){
            throw new ConvoError('invalid-scheme-type');
        }
        return jsonSchemeToConvoTypeString(json,nameOverride);
    }else{
        return jsonSchemeToConvoTypeString(scheme,nameOverride);
    }
}

export const zodSchemeToConvoTypeString=(scheme:ZodTypeAny,nameOverride?:string):string=>{
    const json=zodTypeToJsonScheme(scheme);
    if(!json){
        throw new ConvoError('invalid-scheme-type');
    }
    return jsonSchemeToConvoTypeString(json,nameOverride);
}

export const jsonSchemeToConvoTypeString=(scheme:JsonScheme,nameOverride?:string):string=>{
    const out:string[]=[];
    _jsonSchemeToConvoTypeString(scheme,out,'',null,nameOverride,false,20);
    return out.join('');
}

const tabSize='    ';

const _jsonSchemeToConvoTypeString=(
    scheme:JsonScheme,
    out:string[],
    tab:string,
    label:string|null,
    nameOverride:string|undefined,
    required:boolean,
    maxDepth:number
)=>{
    if(maxDepth<0){
        throw new ConvoError('max-type-conversion-depth-reached');
    }
    maxDepth--;
    if(scheme.description){
        convoDescriptionToCommentOut(scheme.description,tab,out);
        out.push('\n');
    }
    const open=label?`${tab}${label}${required?'':'?'}: `:tab;

    if(scheme.enum){
        out.push(open,'enum(',scheme.enum.map(v=>JSON.stringify(v)).join(' '),')');
    }else if(scheme.type){
        switch(scheme.type){
            case 'object':
                out.push(open,nameOverride??'struct','(\n');
                if(scheme.properties){
                    for(const e in scheme.properties){
                        const prop=scheme.properties[e];
                        if(!prop){continue}
                        _jsonSchemeToConvoTypeString(prop,out,tab+tabSize,e,undefined,scheme.required?.includes(e)?true:false,maxDepth);
                        out.push('\n')
                    }
                }
                out.push(tab,')');
                break;

            case 'array':
                out.push(open,'array(\n');
                if(scheme.items){
                    _jsonSchemeToConvoTypeString(scheme.items,out,tab+tabSize,null,undefined,false,maxDepth);
                    out.push('\n');
                }
                out.push(tab,')');
                break;

            case 'string':
                out.push(open,'string');
                break;

            case 'number':
                out.push(open,'number');
                break;

            case 'boolean':
                out.push(open,'boolean');
                break;

            case 'integer':
                out.push(open,'int');
                break;

            case 'null':
                out.push(open,'null');
                break;

            default:
                throw new ConvoError('unknown-json-scheme-type',undefined,`${scheme.type} is an unknown json scheme type to convo`);

        }
    }else{
        out.push(open,'any');
    }
}



export const describeConvoScheme=(scheme:JsonScheme|ZodTypeAny,value:any,nameOverride?:string):string=>{
    if(valueIsZodType(scheme)){
        const json=zodTypeToJsonScheme(scheme);
        if(!json){
            throw new ConvoError('invalid-scheme-type');
        }
        scheme=json;
    }
    const out:string[]=[];
    _describeScheme('unset',scheme,out,'',null,nameOverride,false,20,value);
    return out.join('');
}

const descTabSize='  ';

const _describeScheme=(
    undefinedValue:string,
    scheme:JsonScheme,
    out:string[],
    tab:string,
    label:string|null,
    nameOverride:string|undefined,
    required:boolean,
    maxDepth:number,
    value:any,
)=>{
    if(maxDepth<0){
        throw new ConvoError('max-type-conversion-depth-reached');
    }
    maxDepth--;
    const open=label?`${tab}- ${label}: `:tab;
    if(scheme.type){
        switch(scheme.type){
            case 'object':
                if(label){
                    out.push(open,'- :\n');
                }
                if(scheme.properties){
                    for(const e in scheme.properties){
                        const prop=scheme.properties[e];
                        if(!prop){continue}
                        _describeScheme(
                            undefinedValue,
                            prop,
                            out,
                            tab+(label?descTabSize:''),
                            e,
                            undefined,
                            scheme.required?.includes(e)?true:false,
                            maxDepth,
                            value?.[e]
                        );
                        out.push('\n')
                    }
                }
                //out.push(tab,')');
                break;

            case 'array':{
                const length=value?.length??0;
                const n=label??'items';
                out.push(open,`${length} ${length===1?wordToSingular(n):n}\n`);
                if(scheme.items && Array.isArray(value)){
                    for(let i=0;i<value.length;i++){
                        const item=value[i];
                        _describeScheme(
                            undefinedValue,
                            scheme.items,
                            out,
                            tab+(label?descTabSize:''),
                            (i+1).toString(),
                            undefined,
                            false,
                            maxDepth,
                            item
                        );

                    }
                    _describeScheme(undefinedValue,scheme.items,out,tab+descTabSize,null,undefined,false,maxDepth,value);
                }
                break;
            }

            default:
                out.push(open,`${value===null?'null':value===undefined?undefinedValue:value}`)
                break;

        }
    }else if(scheme.enum){
        out.push(open,`${value===null?'null':value===undefined?undefinedValue:value}`);
    }else{
        throw new ConvoError('unknown-json-scheme-type',undefined,`json scheme type did not define a type or enum values`);
    }
}
