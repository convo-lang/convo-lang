import { CancelToken } from "@iyio/common";
import { ZodType } from "zod";
import { PromiseResultType, PromiseResultTypeVoid } from "../result-type.js";
import { applyIdentityToConvoDbCommand, applyIdentityToConvoDbCommands, applyIdentityToConvoDbQuery, applyIdentityToPermission } from "./convo-db-lib.js";
import { ConvoDb, ConvoDbCommand, ConvoDbCommandResult, ConvoDbDriver, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeKeySelection, ConvoNodePermissionType, ConvoNodeQuery, ConvoNodeQueryKeysToSelection, ConvoNodeQueryResult, ConvoNodeStreamItem, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions } from "./convo-db-types.js";
import { ConvoDbAuthManager } from "./ConvoDbAuthManager.js";

export interface ConvoDbPermissionBoundaryOptions
{
    proxiedDb:ConvoDb;
    identityPath:string;
    auth:ConvoDbAuthManager;
}

/**
 * The ConvoDbPermissionBoundary class wraps an existing ConvoDb and ensures all calls to the wrapped
 * database use the provided `identityPath`. Permissions boundaries allow save access from external
 * callers ensuring that their access to the wrapped database is restricted to their identityPath.
 * The provided `identityPath` will be used to set the `permissionFrom` of all calls to the wrapped
 * database. The permissionFrom value supplied by external callers will always be overwritten.
 * External callers are not allowed to issue driver commands and will receive a 401 response
 * if they try.
 */
export class ConvoDbPermissionBoundary implements ConvoDb
{
    public readonly dbName:string;
    public readonly auth:ConvoDbAuthManager;
    public readonly proxiedDb:ConvoDb;
    public readonly identityPath:string;
    public readonly parentAuth:ConvoDbAuthManager;
    readonly _driver:ConvoDbDriver;
    public lastUsed=Date.now();

    public constructor({
        proxiedDb,
        identityPath,
        auth,
    }:ConvoDbPermissionBoundaryOptions){
        this.dbName=proxiedDb.dbName;
        this._driver=proxiedDb._driver;
        this.auth=proxiedDb.auth;
        this.proxiedDb=proxiedDb;
        this.identityPath=identityPath;
        this.parentAuth=auth;
    }

    public callFunctionAsync<T extends Record<string, any> = Record<string, any>>(path: string, args: Record<string, any>, _permissionFrom?: string): PromiseResultType<T | undefined> {
        return this.proxiedDb.callFunctionAsync(path,args,this.identityPath);
    }

    public callFunctionWithSchemaAsync<TInput, TOutput>(inputSchema: ZodType<TInput>, outputSchema: ZodType<TOutput>, path: string, args: TInput, _permissionFrom?: string): PromiseResultType<TOutput> {
        return this.proxiedDb.callFunctionWithSchemaAsync(inputSchema,outputSchema,path,args,this.identityPath);
    }

    public callFunctionReturnValueAsync<T extends Record<string, any> = Record<string, any>>(path: string, args: Record<string, any>, _permissionFrom?: string): PromiseResultType<T> {
        return this.proxiedDb.callFunctionReturnValueAsync(path,args,this.identityPath);
    }

    public callFunctionReturnNodeAsync(path: string, args: Record<string, any>, _permissionFrom?: string): PromiseResultType<ConvoNode | undefined> {
        return this.proxiedDb.callFunctionReturnNodeAsync(path,args,this.identityPath);
    }

    public queryNodesAsync<TKeys extends ConvoNodeKeySelection = undefined>(query: ConvoNodeQuery<TKeys>): PromiseResultType<ConvoNodeQueryResult<ConvoNodeQueryKeysToSelection<TKeys>>> {
        return this.proxiedDb.queryNodesAsync(applyIdentityToConvoDbQuery(this.identityPath,query));
    }

    public streamNodesAsync<TKeys extends ConvoNodeKeySelection = undefined>(query: ConvoNodeQuery<TKeys>, cancel?: CancelToken): AsyncIterableIterator<ConvoNodeStreamItem<ConvoNodeQueryKeysToSelection<TKeys>>> {
        return this.proxiedDb.streamNodesAsync(applyIdentityToConvoDbQuery(this.identityPath,query),cancel);
    }

    public getNodesByPathAsync(path: string, _permissionFrom?: string): PromiseResultType<ConvoNodeQueryResult<keyof ConvoNode>> {
        return this.proxiedDb.getNodesByPathAsync(path,this.identityPath);
    }

    public getNodeByPathAsync(path: string, _permissionFrom?: string): PromiseResultType<ConvoNode | undefined> {
        return this.proxiedDb.getNodeByPathAsync(path,this.identityPath);
    }

    public getNodePermissionAsync(_fromPath: string, toPath: string): PromiseResultType<ConvoNodePermissionType> {
        return this.proxiedDb.getNodePermissionAsync(this.identityPath,toPath);
    }

    public checkNodePermissionAsync(_fromPath: string, toPath: string, type: ConvoNodePermissionType, matchAny?: boolean): PromiseResultTypeVoid {
        return this.proxiedDb.checkNodePermissionAsync(this.identityPath,toPath,type,matchAny);
    }

    public insertNodeAsync(node: ConvoNode, options?: InsertConvoNodeOptions): PromiseResultType<ConvoNode> {
        return this.proxiedDb.insertNodeAsync(node,applyIdentityToPermission(this.identityPath,options??{}))
    }

    public updateNodeAsync(node: ConvoNodeUpdate, options?: UpdateConvoNodeOptions): PromiseResultTypeVoid {
        return this.proxiedDb.updateNodeAsync(node,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public deleteNodeAsync(path: string, options?: DeleteConvoNodeOptions): PromiseResultTypeVoid {
        return this.proxiedDb.deleteNodeAsync(path,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public queryEdgesAsync(query: ConvoNodeEdgeQuery): PromiseResultType<ConvoNodeEdgeQueryResult> {
        return this.proxiedDb.queryEdgesAsync(applyIdentityToPermission(this.identityPath,query));
    }

    public getEdgeByIdAsync(id: string, _permissionFrom?: string): PromiseResultType<ConvoNodeEdge> {
        return this.proxiedDb.getEdgeByIdAsync(id,this.identityPath);
    }

    public insertEdgeAsync(edge: Omit<ConvoNodeEdge, "id">, options?: InsertConvoNodeEdgeOptions): PromiseResultType<ConvoNodeEdge> {
        return this.proxiedDb.insertEdgeAsync(edge,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public updateEdgeAsync(update: ConvoNodeEdgeUpdate, options?: UpdateConvoNodeEdgeOptions): PromiseResultTypeVoid {
        return this.proxiedDb.updateEdgeAsync(update,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public deleteEdgeAsync(id: string, options?: DeleteConvoNodeEdgeOptions): PromiseResultTypeVoid {
        return this.proxiedDb.deleteEdgeAsync(id,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public queryEmbeddingsAsync(query: ConvoNodeEmbeddingQuery): PromiseResultType<ConvoNodeEmbeddingQueryResult> {
        return this.proxiedDb.queryEmbeddingsAsync(applyIdentityToPermission(this.identityPath,query));
    }

    public getEmbeddingByIdAsync(id: string, _permissionFrom?: string): PromiseResultType<ConvoNodeEmbedding> {
        return this.proxiedDb.getEmbeddingByIdAsync(id,this.identityPath);
    }

    public insertEmbeddingAsync(embedding: Omit<ConvoNodeEmbedding, "id">, options?: InsertConvoNodeEmbeddingOptions): PromiseResultType<ConvoNodeEmbedding> {
        return this.proxiedDb.insertEmbeddingAsync(embedding,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public updateEmbeddingAsync(update: ConvoNodeEmbeddingUpdate, options?: UpdateConvoNodeEmbeddingOptions): PromiseResultTypeVoid {
        return this.proxiedDb.updateEmbeddingAsync(update,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public deleteEmbeddingAsync(id: string, options?: DeleteConvoNodeEmbeddingOptions): PromiseResultTypeVoid {
        return this.proxiedDb.deleteEmbeddingAsync(id,applyIdentityToPermission(this.identityPath,options??{}));
    }

    public executeCommandAsync<TKeys extends ConvoNodeKeySelection = "*">(command: ConvoDbCommand<TKeys>): PromiseResultType<ConvoDbCommandResult<TKeys>> {
        const r=applyIdentityToConvoDbCommand(this.identityPath,command);
        if(!r.success){
            return Promise.resolve(r);
        }
        return this.proxiedDb.executeCommandAsync(command);
    }

    public executeCommandsAsync(commands: ConvoDbCommand<any>[]): PromiseResultType<ConvoDbCommandResult<any>[]> {
        const r=applyIdentityToConvoDbCommands(this.identityPath,commands);
        if(!r.success){
            return Promise.resolve(r);
        }
        return this.proxiedDb.executeCommandsAsync(commands);
    }

    

}
