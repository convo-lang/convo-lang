import { ConvoNodeCondition, ConvoNodeQuery, isConvoNodeGroupCondition, isConvoNodePropertyCondition } from "./convo-node-types.js";

/**
 * Normalizes a convo node path.
 * 
 * Normalization rules:
 * - leading and trailing whitespace is trimmed
 * - the path must be absolute and start with `/`
 * - duplicate slashes are collapsed to a single slash
 * - trailing slashes are removed except for the root path `/`
 * - `.` and `..` path segments are not allowed
 * - empty strings are invalid
 * 
 * Wildcard rules:
 * - `none` no `*` characters are allowed
 * - `end` a wildcard is allowed only as a trailing `/*`
 * - `any` wildcards may appear anywhere in the path
 * 
 * Returns the normalized path or `undefined` if the path is invalid.
 */
export const normalizeConvoNodePath=(path:string|null|undefined,wildcard:'none'|'end'|'any'):string|undefined=>{
    path=path?.trim();

    if(!path){
        return undefined;
    }

    if(path[0]!=="/"){
        return undefined;
    }

    path=path.replace(/\/+/g,'/');

    if(path!=="/" && path.endsWith('/')){
        path=path.replace(/\/+$/,'');
    }

    const parts=path.split('/');

    for(let i=1;i<parts.length;i++){
        const part=parts[i];
        if(part==="." || part===".."){
            return undefined;
        }
    }

    switch(wildcard){
        case 'none':
            if(path.includes('*')){
                return undefined;
            }
            break;

        case 'end':
            if(path.includes('*')){
                if(!path.endsWith('/*')){
                    return undefined;
                }
                if(path.indexOf('*')!==path.length-1){
                    return undefined;
                }
            }
            break;

        case 'any':
            break;
    }

    return path;
}

export const validateConvoNodeCondition=(condition:ConvoNodeCondition):string|undefined=>{
    if(isConvoNodePropertyCondition(condition)){
        if(
            (condition.target==='path' || condition.target==='toPath' || condition.target==='fromPath') &&
            normalizeConvoNodePath(condition.target,'any')!==condition.target
        ){
            return `target path should be normalized`;
        }
        if( (
                condition.op==='in' || condition.op==='all-in' || condition.op==='any-in' ||
                condition.op==='contains-all' || condition.op==='contains-any'
            ) && !Array.isArray(condition.value)
        ){
            return `condition value must be array for op(${condition.op})`
        }
    }else if(isConvoNodeGroupCondition(condition)){
        for(const c of condition.conditions){
            const error=validateConvoNodeCondition(c);
            if(error){
                return error;
            }
        }
    }else{
        return 'Unknown condition type';
    }
    return undefined;
}
export const validateConvoNodeQuery=(query:ConvoNodeQuery<any>):string|undefined=>{
    if(query.permissionFrom!==undefined && normalizeConvoNodePath(query.permissionFrom,'none')){
        return `Invalid query permissionFrom. permissionFrom:${query.permissionFrom}`
    }
    for(let i=0;i<query.steps.length;i++){
        const step=query.steps[i];
        if(!step){
            return `Undefined step at index ${i}`;
        }
        if(step.path!==undefined && normalizeConvoNodePath(step.path,'end')){
            return `Invalid step path. stepIndex: ${i}, path:${step.path}`
        }
        if(step.permissionFrom!==undefined && normalizeConvoNodePath(step.permissionFrom,'none')){
            return `Invalid step permissionFrom. stepIndex: ${i}, permissionFrom:${step.permissionFrom}`
        }

        if(step.condition){
            const error=validateConvoNodeCondition(step.condition);
            if(error){
                return error;
            }
        }

        if(step.edge && (typeof step.edge==='object')){
            const error=validateConvoNodeCondition(step.edge);
            if(error){
                return error;
            }
        }
        
    }

    return undefined;
}