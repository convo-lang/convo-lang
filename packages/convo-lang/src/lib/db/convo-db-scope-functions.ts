import { getDirectoryName, joinPaths } from "@iyio/common";
import { convoFunctions, convoVars, createConvoScopeFunction } from "../convo-lib.js";
import { ConvoScope } from "../convo-types.js";
import { convoDbService } from "../convo.deps.js";
import { ConvoExecutionContext } from "../ConvoExecutionContext.js";
import { ResultType } from "../result-type.js";
import { getConvoDbUsingConnectionStringAsync } from "./convo-db-connection-loader.js";
import { ConvoDb, ConvoNode, ConvoNodeEdge, ConvoNodeEmbedding } from "./convo-db-types.js";

const callDbAsync=async (fnName:keyof ConvoDb,scope:ConvoScope,ctx:ConvoExecutionContext)=>{
    let db=(ctx.getVar(convoVars.__db)||convoDbService.get()) as ConvoDb|undefined;
    if(!db){
        const connectionString=ctx.getVar(convoVars.__dbConnection);
        if(typeof connectionString === 'string'){
            db=await getConvoDbUsingConnectionStringAsync(connectionString);
            if(db){
                ctx.setVar(true,db,convoVars.__db);
            }
        }
        if(!db){
            return '!Error: DB not configured';
        }
    }
    

    if(typeof db[fnName]!=='function'){
        return `!Error: db function not defined - ${fnName}`;
    }

    const r=await (db as any)[fnName].apply(db,scope.paramValues??[]) as ResultType<any>;

    if(r.success){
        switch(fnName){

            case 'checkNodePermissionAsync':
                return r.success;

            case 'insertNodeAsync':
                return {newNodePath:(r.result as ConvoNode).path};

            case 'insertEdgeAsync':
                return {newEdgeId:(r.result as ConvoNodeEdge).id};

            case 'insertEmbeddingAsync':
                return {newEmbeddingId:(r.result as ConvoNodeEmbedding).id};

            case 'updateNodeAsync':
            case 'updateEdgeAsync':
            case 'updateEmbeddingAsync':
            case 'deleteNodeAsync':
            case 'deleteEdgeAsync':
            case 'deleteEmbeddingAsync':
                return 'Operation complete';
                
            default:
                return r.result;
        }
    }else{
        return `!Error[${r.statusCode}]: ${r.error}`;
    }
}

export const convoDbQueryNodesScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('queryNodesAsync',scope,ctx));
export const convoDbGetNodesByPathScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('getNodesByPathAsync',scope,ctx));
export const convoDbGetNodePermissionScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('getNodePermissionAsync',scope,ctx));
export const convoDbCheckNodePermissionScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('checkNodePermissionAsync',scope,ctx));
export const convoDbInsertNodeScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('insertNodeAsync',scope,ctx));
export const convoDbUpdateNodeScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('updateNodeAsync',scope,ctx));
export const convoDbDeleteNodeScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('deleteNodeAsync',scope,ctx));
export const convoDbQueryEdgesScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('queryEdgesAsync',scope,ctx));
export const convoDbGetEdgeByIdScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('getEdgeByIdAsync',scope,ctx));
export const convoDbInsertEdgeScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('insertEdgeAsync',scope,ctx));
export const convoDbUpdateEdgeScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('updateEdgeAsync',scope,ctx));
export const convoDbDeleteEdgeScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('deleteEdgeAsync',scope,ctx));
export const convoDbQueryEmbeddingsScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('queryEmbeddingsAsync',scope,ctx));
export const convoDbGetEmbeddingByIdScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('getEmbeddingByIdAsync',scope,ctx));
export const convoDbInsertEmbeddingScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('insertEmbeddingAsync',scope,ctx));
export const convoDbUpdateEmbeddingScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('updateEmbeddingAsync',scope,ctx));
export const convoDbDeleteEmbeddingScopeFunction=createConvoScopeFunction((scope,ctx)=>callDbAsync('deleteEmbeddingAsync',scope,ctx));

export const convoDbConfigScopeFunction=createConvoScopeFunction((scope,ctx)=>{
    let conn=scope.paramValues?.[0];
    if(typeof conn!=='string'){
        throw new Error('dbConfig only accepts a connection string')
    }
    const location=ctx.getVar(convoVars.__file,scope);
    if(typeof location === 'string'){
        const i=conn.indexOf(':');
        const tag=i===-1?conn:conn.substring(0,i).trim();
        let con=i===-1?undefined:conn.substring(i+1).trim();
        if(con?.startsWith('./')){
            con=joinPaths(getDirectoryName(location),con.substring(2));
        }
        conn=`${tag}:${con}`;
    }
    ctx.setVar(true,conn,convoVars.__dbConnection);

});

export const getConvoDbScopeFunctions=()=>{
    return {
        [convoFunctions.dbQueryNodes]:convoDbQueryNodesScopeFunction,
        [convoFunctions.dbGetNodesByPath]:convoDbGetNodesByPathScopeFunction,
        [convoFunctions.dbGetNodePermission]:convoDbGetNodePermissionScopeFunction,
        [convoFunctions.dbCheckNodePermission]:convoDbCheckNodePermissionScopeFunction,
        [convoFunctions.dbInsertNode]:convoDbInsertNodeScopeFunction,
        [convoFunctions.dbUpdateNode]:convoDbUpdateNodeScopeFunction,
        [convoFunctions.dbDeleteNode]:convoDbDeleteNodeScopeFunction,
        [convoFunctions.dbQueryEdges]:convoDbQueryEdgesScopeFunction,
        [convoFunctions.dbGetEdgeById]:convoDbGetEdgeByIdScopeFunction,
        [convoFunctions.dbInsertEdge]:convoDbInsertEdgeScopeFunction,
        [convoFunctions.dbUpdateEdge]:convoDbUpdateEdgeScopeFunction,
        [convoFunctions.dbDeleteEdge]:convoDbDeleteEdgeScopeFunction,
        [convoFunctions.dbQueryEmbeddings]:convoDbQueryEmbeddingsScopeFunction,
        [convoFunctions.dbGetEmbeddingById]:convoDbGetEmbeddingByIdScopeFunction,
        [convoFunctions.dbInsertEmbedding]:convoDbInsertEmbeddingScopeFunction,
        [convoFunctions.dbUpdateEmbedding]:convoDbUpdateEmbeddingScopeFunction,
        [convoFunctions.dbDeleteEmbedding]:convoDbDeleteEmbeddingScopeFunction,
        [convoFunctions.dbConfig]:convoDbConfigScopeFunction,
    }
}

