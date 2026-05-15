import type { ConvoDbDriver, ConvoDbDriverNextToken, ConvoDbDriverPathsResult, ConvoDbFsItem, ConvoEmbeddingSearch, ConvoNode, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeOrderBy, ConvoNodeQueryStep, ConvoNodeUpdate, DeleteConvoNodeEdgeOptions, DeleteConvoNodeEmbeddingOptions, DeleteConvoNodeOptions, InsertConvoNodeEdgeOptions, InsertConvoNodeEmbeddingOptions, InsertConvoNodeOptions, PromiseResultType, PromiseResultTypeVoid, UpdateConvoNodeEdgeOptions, UpdateConvoNodeEmbeddingOptions, UpdateConvoNodeOptions } from '@convo-lang/convo-lang';
import { BaseConvoDb, BaseConvoDbOptions } from '@convo-lang/db/BaseConvoDb.js';
import { createJsonQueryPathMatcher, doesJsonQueryEdgeMatchCondition, doesJsonQueryEdgeMatchQuery, doesJsonQueryEmbeddingMatchQuery, evaluateJsonQueryCondition, hasJsonQueryPermission, selectJsonQueryEdgeDestinationPaths, selectJsonQueryKeys, sortJsonQueryValues } from '@convo-lang/db/json-query.js';
import { getContentType } from '@iyio/common';
import { pathExistsAsync } from "@iyio/node-common";
import { glob } from 'glob';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';


export interface NodeFsConvoDbOptions extends BaseConvoDbOptions
{
    /**
     * Path to where the root of the virtual file system will mount into the real file system.
     * Relative paths are relative to the current working directory.
     * @default "./fs-db-root"
     */
    root?:string;

    /**
     * Directory will edges are stored. Edges are store as json file using their id as their
     * file name. example edge file path: ./.cdb-metadata/edges/d67cb66f-5c88-459c-94b5-a2265a6025d4.json
     * Relative paths are relative to the current working directory. The default value is relative to root.
     * @default path.join(root,'.@db-metadata/edges')
     */
    edgeDirectory?:string;

    /**
     * Directory will embeddings are stored. Edges are store as json file using their id as their file name.
     * Relative paths are relative to the current working directory. The default value is relative to root.
     * @default path.join(root,'.@db-metadata/embeddings')
     */
    embeddingsDirectory?:string;

    /**
     * Suffix appended to the end of node paths. It is recommended to always start the suffix
     * with ".@db-" to prevent the possibility of blob and metadata paths from colliding.
     * Example path with suffix:
     * `/usr/tom/stocks.md` -> `/usr/tom/stocks.md.@db-n.json`
     * @default ".@db-n.json"
     */
    nodeSuffix?:string;

    /**
     * An optional suffix to append to the end of paths to blobs. By default blobs are stored with out a suffix
     */
    blobSuffix?:string;

    /**
     * File extensions that should be loaded as json nodes when `nodeSuffix` is empty and the database
     * is operating in metadata mode.
     * @default ['.json']
     */
    jsonExtensions?:string[];
}

export class NodeFsConvoDb extends BaseConvoDb
{
    public readonly root:string;

    public readonly edgeDirectory:string;

    public readonly embeddingsDirectory:string;

    public readonly nodeSuffix:string;

    public readonly blobSuffix:string;

    public readonly jsonExtensions:string[];

    override readonly _driver:ConvoDbDriver;

    private readonly _driverT:NodeFsConvoDbDriver;

    public constructor({
        root='./fs-db-root',
        edgeDirectory=path.join(root,'.@db-metadata/edges'),
        embeddingsDirectory=path.join(root,'.@db-metadata/embeddings'),
        nodeSuffix='.@db-n.json',
        blobSuffix='',
        jsonExtensions=['.json'],
        ...baseOptions
    }:NodeFsConvoDbOptions){
        super(baseOptions);
        this.root=path.resolve(root);
        this.edgeDirectory=path.resolve(edgeDirectory);
        this.embeddingsDirectory=path.resolve(embeddingsDirectory);
        this.nodeSuffix=nodeSuffix;
        this.blobSuffix=blobSuffix;
        this.jsonExtensions=jsonExtensions;
        this._driver=this._driverT=new NodeFsConvoDbDriver({
            root:this.root,
            edgeDirectory:this.edgeDirectory,
            embeddingsDirectory:this.embeddingsDirectory,
            nodeSuffix:this.nodeSuffix,
            blobSuffix:this.blobSuffix,
            jsonExtensions:this.jsonExtensions,
        });
    }

    protected override async _initAsync():PromiseResultTypeVoid{
        return await this._driverT.initAsync();
    }

    protected override _dispose():void{
        this._driverT.dispose();
    }
}

export interface NodeFsConvoDbDriverOptions
{
    root:string;
    edgeDirectory:string;
    embeddingsDirectory:string;
    nodeSuffix:string;
    blobSuffix:string;
    jsonExtensions:string[];
}

export class NodeFsConvoDbDriver implements ConvoDbDriver
{
    public readonly root:string;

    public readonly edgeDirectory:string;

    public readonly embeddingsDirectory:string;

    public readonly nodeSuffix:string;

    public readonly blobSuffix:string;

    public readonly jsonExtensions:string[];

    public constructor({
        root,
        edgeDirectory,
        embeddingsDirectory,
        nodeSuffix,
        blobSuffix,
        jsonExtensions,
    }:NodeFsConvoDbDriverOptions){
        this.root=root;
        this.edgeDirectory=edgeDirectory;
        this.embeddingsDirectory=embeddingsDirectory;
        this.nodeSuffix=nodeSuffix;
        this.blobSuffix=blobSuffix;
        this.jsonExtensions=jsonExtensions;
    }

    public async initAsync():PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            await mkdir(this.root,{recursive:true});
            await mkdir(this.edgeDirectory,{recursive:true});
            await mkdir(this.embeddingsDirectory,{recursive:true});
        });
    }

    public dispose():void
    {
    }

    public async openBlobAsync(blobPath:string):PromiseResultType<ReadableStream>{
        if(!await pathExistsAsync(this._getBlobFsPath(blobPath))){
            return {
                success:false,
                error:'Not found',
                statusCode:404,
            }
        }
        return await this._runAsync(async ()=>{
            const s=createReadStream(this._getBlobFsPath(blobPath));
            return Readable.toWeb(s) as any as ReadableStream;
        });
    }

    public async writeBlobAsync(blobPath:string,blob:string|Blob|ReadableStream|null):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            const fsPath=this._getBlobFsPath(blobPath);
            if(blob==null){
                await rm(fsPath,{force:true});
                return;
            }
            await mkdir(path.dirname(fsPath),{recursive:true});
            if(typeof blob==='string'){
                await writeFile(fsPath,blob);
            }else if(blob instanceof Blob){
                await writeFile(fsPath,new Uint8Array(await blob.arrayBuffer()));
            }else{
                await pipeline(
                    blob,
                    createWriteStream(fsPath)
                );
            }
        });
    }

    public async hasBlobAsync(blobPath:string):PromiseResultType<boolean>{
        return await this._runAsync(async ()=>{
            try{
                const s=await stat(this._getBlobFsPath(blobPath));
                return s.isFile();
            }catch(ex){
                if(this._isNotFound(ex)){
                    return false;
                }
                throw ex;
            }
        });
    }

    public async selectEdgesByPathsAsync(keys:(keyof ConvoNodeEdge)[]|'*',fromPathsIn:string[],toPathsIn:string[],hasGrant:boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>{
        return await this._runAsync(async ()=>{
            const from=new Set(fromPathsIn);
            const to=new Set(toPathsIn);
            const edges=await this._readEdgesAsync();
            return edges
                .filter(edge=>
                    from.has(edge.from) &&
                    to.has(edge.to) &&
                    (!hasGrant || (edge.grant!==undefined && edge.grant!==0))
                )
                .map(edge=>selectJsonQueryKeys(edge,keys));
        });
    }

    public async selectNodesByPathsAsync(keys:(keyof ConvoNode)[]|'*',paths:string[],orderBy:ConvoNodeOrderBy[]):PromiseResultType<Partial<ConvoNode>[]>{
        return await this._runAsync(async ()=>{
            const nodes:ConvoNode[]=[];
            for(const nodePath of paths){
                const node=await this._readNodeAsync(nodePath);
                if(node){
                    nodes.push(node);
                }
            }
            this._sortNodes(nodes,orderBy,paths);
            return nodes.map(node=>selectJsonQueryKeys(node,keys));
        });
    }

    public async selectNodePathsForPathAsync(step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>{
        return await this._runAsync(async ()=>{
            const matches=createJsonQueryPathMatcher(step.path);
            const paths=currentNodePaths??await this._readNodePathsForPathAsync(step.path);
            const selected=currentNodePaths?paths.filter(matches):paths;
            return {
                paths:await this._pageOrderedPathsAsync(selected,orderBy,limit,offset),
                nextToken:undefined,
            };
        });
    }

    public async selectNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>{
        return await this._runAsync(async ()=>{
            const paths=currentNodePaths??await this._readNodePathsAsync();
            const selected:string[]=[];
            for(const nodePath of paths){
                const node=await this._readNodeAsync(nodePath);
                if(node && evaluateJsonQueryCondition(node,step.condition)){
                    selected.push(node.path);
                }
            }
            return {
                paths:await this._pageOrderedPathsAsync(selected,orderBy,limit,offset),
                nextToken:undefined,
            };
        });
    }

    public async selectNodePathsForPermissionAsync(step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>{
        return await this._runAsync(async ()=>{
            const paths=currentNodePaths??await this._readNodePathsAsync();
            const edges=await this._readEdgesAsync();
            const selected=paths.filter(nodePath=>hasJsonQueryPermission(edges,step.permissionFrom,nodePath,step.permissionRequired));
            return {
                paths:await this._pageOrderedPathsAsync(selected,orderBy,limit,offset),
                nextToken:undefined,
            };
        });
    }

    public async selectNodePathsForEmbeddingAsync(step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>{
        return await this._runAsync(async ()=>{
            const pathSet=currentNodePaths?new Set(currentNodePaths):null;
            const embeddings=await this._readEmbeddingsAsync();
            const selected=new Set<string>();
            for(const embedding of embeddings){
                if(pathSet && !pathSet.has(embedding.path)){
                    continue;
                }
                if(await this._doesEmbeddingMatchAsync(embedding,step.embedding)){
                    selected.add(embedding.path);
                }
            }
            return {
                paths:await this._pageOrderedPathsAsync([...selected],orderBy,limit,offset),
                nextToken:undefined,
            };
        });
    }

    public async selectEdgeNodePathsForConditionAsync(step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number,nextToken:string|undefined):PromiseResultType<ConvoDbDriverPathsResult>{
        return await this._runAsync(async ()=>{
            const sourcePaths=currentNodePaths??await this._readNodePathsAsync();
            const edges=await this._readEdgesAsync();
            const selected=selectJsonQueryEdgeDestinationPaths(edges,step,sourcePaths);

            return {
                paths:await this._pageOrderedPathsAsync(selected,orderBy,limit,offset),
                nextToken:undefined,
            };
        });
    }

    public async insertNodeAsync(node:ConvoNode,options:Omit<InsertConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNode>{
        return await this._runAsync(async ()=>{
            await this._writeNodeAsync(node);
            return node;
        });
    }

    public async updateNodeAsync(update:ConvoNodeUpdate,options:Omit<UpdateConvoNodeOptions,'permissionFrom'|'mergeData'>|undefined):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            const node=await this._readNodeRequiredAsync(update.path);
            this._assignNullable(node,update,'displayName');
            this._assignNullable(node,update,'modified');
            this._assignNullable(node,update,'description');
            this._assignNullable(node,update,'instructions');
            if(update.data!==undefined){
                node.data=update.data??{};
            }
            await this._writeNodeAsync(node);
        });
    }

    public async deleteNodeAsync(nodePath:string,options:Omit<DeleteConvoNodeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            if(this._isMetadataMode() && !this._hasJsonNodeExtension(this._getNodeFsPath(nodePath))){
                throw new Error('Metadata nodes are read only');
            }
            await rm(this._getNodeFsPath(nodePath),{force:true});
            const edges=await this._readEdgesAsync();
            await Promise.all(edges
                .filter(edge=>edge.from===nodePath || edge.to===nodePath)
                .map(edge=>rm(this._getEdgeFsPath(edge.id),{force:true}))
            );
            const embeddings=await this._readEmbeddingsAsync();
            await Promise.all(embeddings
                .filter(embedding=>embedding.path===nodePath)
                .map(embedding=>rm(this._getEmbeddingFsPath(embedding.id),{force:true}))
            );
        });
    }

    public async insertEdgeAsync(edge:Omit<ConvoNodeEdge,'id'>,options:Omit<InsertConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEdge>{
        return await this._runAsync(async ()=>{
            const newEdge:ConvoNodeEdge={...edge,id:randomUUID()};
            await this._writeEdgeAsync(newEdge);
            return newEdge;
        });
    }

    public async updateEdgeAsync(update:ConvoNodeEdgeUpdate,options:Omit<UpdateConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            const edge=await this._readEdgeRequiredAsync(update.id);
            this._assignNullable(edge,update,'displayName');
            this._assignNullable(edge,update,'modified');
            this._assignNullable(edge,update,'description');
            this._assignNullable(edge,update,'instructions');
            this._assignNullable(edge,update,'grant');
            await this._writeEdgeAsync(edge);
        });
    }

    public async deleteEdgeAsync(id:string,options:Omit<DeleteConvoNodeEdgeOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            await rm(this._getEdgeFsPath(id),{force:true});
        });
    }

    public async insertEmbeddingAsync(embedding:Omit<ConvoNodeEmbedding,'id'>,options:Omit<InsertConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEmbedding>{
        return await this._runAsync(async ()=>{
            const newEmbedding:ConvoNodeEmbedding={...embedding,id:randomUUID()};
            await this._writeEmbeddingAsync(newEmbedding);
            return newEmbedding;
        });
    }

    public async deleteEmbeddingAsync(id:string,options:Omit<DeleteConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            await rm(this._getEmbeddingFsPath(id),{force:true});
        });
    }

    public async updateEmbeddingAsync(update:ConvoNodeEmbeddingUpdate,options:Omit<UpdateConvoNodeEmbeddingOptions,'permissionFrom'>|undefined):PromiseResultTypeVoid{
        return await this._runVoidAsync(async ()=>{
            const embedding=await this._readEmbeddingRequiredAsync(update.id);
            this._assignNullable(embedding,update,'modified');
            this._assignNullable(embedding,update,'description');
            this._assignNullable(embedding,update,'instructions');
            await this._writeEmbeddingAsync(embedding);
        });
    }

    public async queryEdgesAsync(query:ConvoNodeEdgeQuery&ConvoDbDriverNextToken):PromiseResultType<ConvoNodeEdgeQueryResult&ConvoDbDriverNextToken>{
        return await this._runAsync(async ()=>{
            const offset=query.offset??0;
            const limit=query.limit??50;
            const edges=(await this._readEdgesAsync()).filter(edge=>doesJsonQueryEdgeMatchQuery(edge,query));
            return {
                edges:edges.slice(offset,offset+limit),
                total:query.includeTotal?edges.length:undefined,
                nextToken:undefined,
            };
        });
    }

    public async queryEmbeddingsAsync(query:ConvoNodeEmbeddingQuery&ConvoDbDriverNextToken):PromiseResultType<ConvoNodeEmbeddingQueryResult&ConvoDbDriverNextToken>{
        return await this._runAsync(async ()=>{
            const offset=query.offset??0;
            const limit=query.limit??50;
            const embeddings=(await this._readEmbeddingsAsync())
                .filter(embedding=>doesJsonQueryEmbeddingMatchQuery(embedding,query))
                .map(embedding=>query.includeVector?embedding:this._omitVector(embedding));
            return {
                embeddings:embeddings.slice(offset,offset+limit),
                total:query.includeTotal?embeddings.length:undefined,
                nextToken:undefined,
            };
        });
    }

    private async _runAsync<T>(fn:()=>Promise<T>):PromiseResultType<T>{
        try{
            return {
                success:true,
                result:await fn(),
            };
        }catch(ex){
            return {
                success:false,
                error:this._getErrorMessage(ex),
                statusCode:this._isNotFound(ex)?404:500,
            };
        }
    }

    private async _runVoidAsync(fn:()=>Promise<void>):PromiseResultTypeVoid{
        try{
            await fn();
            return {
                success:true,
            };
        }catch(ex){
            return {
                success:false,
                error:this._getErrorMessage(ex),
                statusCode:this._isNotFound(ex)?404:500,
            };
        }
    }

    private _getErrorMessage(ex:unknown):string{
        return ex instanceof Error?ex.message:String(ex);
    }

    private _isNotFound(ex:unknown):boolean{
        return !!ex && typeof ex==='object' && 'code' in ex && ex.code==='ENOENT';
    }

    private _getNodeFsPath(nodePath:string):string{
        return path.join(this.root,nodePath.slice(1)+this.nodeSuffix);
    }

    private _getBlobFsPath(blobPath:string):string{
        return path.join(this.root,blobPath.slice(1)+this.blobSuffix);
    }

    private _getEdgeFsPath(id:string):string{
        return path.join(this.edgeDirectory,`${id}.json`);
    }

    private _getEmbeddingFsPath(id:string):string{
        return path.join(this.embeddingsDirectory,`${id}.json`);
    }

    private async _writeNodeAsync(node:ConvoNode):Promise<void>{
        const fsPath=this._getNodeFsPath(node.path);
        if(this._isMetadataMode() && !this._hasJsonNodeExtension(fsPath)){
            throw new Error('Metadata nodes are read only');
        }
        await mkdir(path.dirname(fsPath),{recursive:true});
        await writeFile(fsPath,JSON.stringify(node,null,4));
    }

    private async _readNodeAsync(nodePath:string):Promise<ConvoNode|undefined>{
        if(this._isMetadataMode()){
            return await this._readMetadataNodeAsync(nodePath);
        }

        try{
            return JSON.parse(await readFile(this._getNodeFsPath(nodePath),'utf8'));
        }catch(ex){
            if(this._isNotFound(ex)){
                return undefined;
            }
            throw ex;
        }
    }

    private async _readNodeRequiredAsync(nodePath:string):Promise<ConvoNode>{
        const node=await this._readNodeAsync(nodePath);
        if(!node){
            throw new Error(`Node not found: ${nodePath}`);
        }
        return node;
    }

    private async _readNodePathsAsync():Promise<string[]>{
        if(this._isMetadataMode()){
            return await this._readMetadataNodePathsForPathAsync('/**');
        }

        return await this._readNodePathsForPathAsync('/**');
    }

    private async _readNodePathsForPathAsync(nodePath:string):Promise<string[]>{
        if(this._isMetadataMode()){
            return await this._readMetadataNodePathsForPathAsync(nodePath);
        }

        if(!this._hasPathGlob(nodePath)){
            try{
                const fsPath=this._getNodeFsPath(nodePath);
                const s=await stat(fsPath);
                return s.isFile()?[nodePath]:[];
            }catch(ex){
                if(this._isNotFound(ex)){
                    return [];
                }
                throw ex;
            }
        }

        const matches=createJsonQueryPathMatcher(nodePath);
        const fsPaths=await this._globFsPathsAsync(this._createNodeGlobPatterns(nodePath));
        const paths:string[]=[];
        for(const fsPath of fsPaths){
            const s=await stat(fsPath);
            if(!s.isFile()){
                continue;
            }
            const selectedPath=this._fsPathToNodePath(fsPath);
            if(selectedPath!==undefined && matches(selectedPath)){
                paths.push(selectedPath);
            }
        }
        return [...new Set(paths)].sort();
    }

    private _fsPathToNodePath(fsPath:string):string|undefined{
        const rel=path.relative(this.root,fsPath).split(path.sep).join('/');
        if(this.nodeSuffix && !rel.endsWith(this.nodeSuffix)){
            return undefined;
        }
        const withoutSuffix=this.nodeSuffix?rel.slice(0,-this.nodeSuffix.length):rel;
        return withoutSuffix?`/${withoutSuffix}`:'/';
    }

    private async _writeEdgeAsync(edge:ConvoNodeEdge):Promise<void>{
        await mkdir(this.edgeDirectory,{recursive:true});
        await writeFile(this._getEdgeFsPath(edge.id),JSON.stringify(edge,null,4));
    }

    private async _readEdgeRequiredAsync(id:string):Promise<ConvoNodeEdge>{
        return JSON.parse(await readFile(this._getEdgeFsPath(id),'utf8'));
    }

    private async _readEdgesAsync():Promise<ConvoNodeEdge[]>{
        return await this._readJsonDirectoryAsync<ConvoNodeEdge>(this.edgeDirectory);
    }

    private async _writeEmbeddingAsync(embedding:ConvoNodeEmbedding):Promise<void>{
        await mkdir(this.embeddingsDirectory,{recursive:true});
        await writeFile(this._getEmbeddingFsPath(embedding.id),JSON.stringify(embedding,null,4));
    }

    private async _readEmbeddingRequiredAsync(id:string):Promise<ConvoNodeEmbedding>{
        return JSON.parse(await readFile(this._getEmbeddingFsPath(id),'utf8'));
    }

    private async _readEmbeddingsAsync():Promise<ConvoNodeEmbedding[]>{
        return await this._readJsonDirectoryAsync<ConvoNodeEmbedding>(this.embeddingsDirectory);
    }

    private async _readJsonDirectoryAsync<T>(dir:string):Promise<T[]>{
        let entries;
        try{
            entries=await readdir(dir,{withFileTypes:true});
        }catch(ex){
            if(this._isNotFound(ex)){
                return [];
            }
            throw ex;
        }

        const values:T[]=[];
        for(const entry of entries){
            if(!entry.isFile() || !entry.name.endsWith('.json')){
                continue;
            }
            values.push(JSON.parse(await readFile(path.join(dir,entry.name),'utf8')));
        }
        return values;
    }

    private async _globFsPathsAsync(patterns:string|string[]):Promise<string[]>{
        const values:string[]=[];
        const results=await glob(patterns,{cwd:this.root,dot:true});
        for await(const result of results as AsyncIterable<string>|string[]){
            values.push(path.resolve(this.root,result));
        }
        return values;
    }

    private _assignNullable<T extends Record<string,any>,U extends Record<string,any>,K extends keyof T&keyof U>(target:T,source:U,key:K):void{
        if(source[key]===undefined){
            return;
        }
        if(source[key]===null){
            delete target[key];
        }else{
            target[key]=source[key];
        }
    }

    private async _pageOrderedPathsAsync(paths:string[],orderBy:ConvoNodeOrderBy[],limit:number,offset:number):Promise<string[]>{
        if(!orderBy.length){
            return paths.slice(offset,offset+limit);
        }

        const nodes:ConvoNode[]=[];
        for(const nodePath of paths){
            const node=await this._readNodeAsync(nodePath);
            if(node){
                nodes.push(node);
            }
        }
        this._sortNodes(nodes,orderBy,paths);
        return nodes.map(node=>node.path).slice(offset,offset+limit);
    }

    private _sortNodes(nodes:ConvoNode[],orderBy:ConvoNodeOrderBy[],pathOrder?:string[]):void{
        sortJsonQueryValues(nodes,orderBy,{pathOrder,getPath:node=>node.path,nullsLast:true});
    }

    private _doesEdgeMatch(edge:ConvoNodeEdge,condition:string|ConvoNodeQueryStep['condition']):boolean{
        return condition!==undefined && doesJsonQueryEdgeMatchCondition(edge,condition);
    }

    private async _doesEmbeddingMatchAsync(embedding:ConvoNodeEmbedding,search:ConvoEmbeddingSearch):Promise<boolean>{
        if(search.type!==undefined && embedding.type!==search.type){
            return false;
        }

        const text=search.text.trim().toLowerCase();
        if(!text){
            return true;
        }

        const embeddingText=[
            embedding.name,
            embedding.description,
            embedding.instructions,
        ].filter(v=>v!==undefined).join('\n').toLowerCase();

        if(embeddingText.includes(text)){
            return true;
        }

        const node=await this._readNodeAsync(embedding.path);
        return node?JSON.stringify(node).toLowerCase().includes(text):false;
    }

    private _omitVector(embedding:ConvoNodeEmbedding):ConvoNodeEmbedding{
        const {vector,...rest}=embedding;
        return rest;
    }

    private _isMetadataMode():boolean{
        return this.nodeSuffix==='';
    }

    private async _readMetadataNodeAsync(nodePath:string):Promise<ConvoNode|undefined>{
        const fsPath=this._getNodeFsPath(nodePath);
        if(this._isReservedFsPath(fsPath)){
            return undefined;
        }

        let s;
        try{
            s=await stat(fsPath);
        }catch(ex){
            if(this._isNotFound(ex)){
                return undefined;
            }
            throw ex;
        }

        if(s.isDirectory()){
            return {
                path:nodePath,
                name:this._getNodeName(nodePath),
                type:'db-metadata-dir',
                data:await this._readMetadataDirectoryItemsAsync(fsPath,nodePath) as any,
            };
        }

        if(this._hasJsonNodeExtension(fsPath)){
            return JSON.parse(await readFile(fsPath,'utf8'));
        }

        return {
            path:nodePath,
            name:this._getNodeName(nodePath),
            type:'db-metadata-file',
            data:this._createFsItem(this._getNodeName(nodePath),nodePath,s) as any,
        };
    }

    private async _readMetadataDirectoryItemsAsync(dir:string,nodePath:string):Promise<ConvoDbFsItem[]>{
        let entries;
        try{
            entries=await readdir(dir,{withFileTypes:true});
        }catch(ex){
            if(this._isNotFound(ex)){
                return [];
            }
            throw ex;
        }

        const items:ConvoDbFsItem[]=[];
        for(const entry of entries){
            const fsPath=path.join(dir,entry.name);
            if(this._isReservedFsPath(fsPath)){
                continue;
            }
            const itemPath=nodePath==='/'?`/${entry.name}`:`${nodePath}/${entry.name}`;
            items.push(this._createFsItem(entry.name,itemPath,await stat(fsPath)));
        }
        return items.sort((a,b)=>a.name.localeCompare(b.name));
    }

    private async _readMetadataNodePathsForPathAsync(nodePath:string):Promise<string[]>{
        const matches=createJsonQueryPathMatcher(nodePath);

        if(!this._hasPathGlob(nodePath)){
            const fsPath=this._getNodeFsPath(nodePath);
            if(this._isReservedFsPath(fsPath)){
                return [];
            }
            try{
                await stat(fsPath);
                return [nodePath];
            }catch(ex){
                if(this._isNotFound(ex)){
                    return [];
                }
                throw ex;
            }
        }

        const paths:string[]=[];
        if(matches('/')){
            paths.push('/');
        }

        const fsPaths=await this._globFsPathsAsync(this._createMetadataGlobPatterns(nodePath));
        for(const fsPath of fsPaths){
            if(this._isReservedFsPath(fsPath)){
                continue;
            }
            const s=await stat(fsPath);
            if(!s.isDirectory() && !s.isFile() && !s.isFIFO()){
                continue;
            }
            const selectedPath=this._fsPathToNodePath(fsPath);
            if(selectedPath!==undefined && matches(selectedPath)){
                paths.push(selectedPath);
            }
        }
        return [...new Set(paths)].sort();
    }

    private _createFsItem(name:string,itemPath:string,s:Awaited<ReturnType<typeof stat>>):ConvoDbFsItem{
        const contentType=s.isFile()?getContentType(name)??undefined:undefined;
        return {
            name,
            path:itemPath,
            size:Number(s.size),
            contentType,
            isDir:s.isDirectory()||undefined,
            isFile:s.isFile()||undefined,
            isFifo:s.isFIFO()||undefined,
        };
    }

    private _createNodeGlobPatterns(nodePath:string):string[]{
        const prefix=this._getGlobStaticPrefix(nodePath);
        const patterns=[
            `${prefix}**/*${this.nodeSuffix}`,
        ];
        if(prefix){
            patterns.push(`${prefix.slice(0,-1)}${this.nodeSuffix}`);
        }else{
            patterns.push(`*${this.nodeSuffix}`);
        }
        return patterns;
    }

    private _createMetadataGlobPatterns(nodePath:string):string[]{
        const prefix=this._getGlobStaticPrefix(nodePath);
        const patterns=[
            `${prefix}**/*`,
        ];
        if(prefix){
            patterns.push(prefix.slice(0,-1));
        }else{
            patterns.push('*');
        }
        return patterns;
    }

    private _getGlobStaticPrefix(nodePath:string):string{
        const rel=nodePath==='/'?'':nodePath.slice(1);
        const wildcardIndex=rel.search(/[*]/);
        if(wildcardIndex===-1){
            return rel.endsWith('/')?rel:path.dirname(rel)==='.'?'':`${path.dirname(rel).split(path.sep).join('/')}/`;
        }
        const slashIndex=rel.slice(0,wildcardIndex).lastIndexOf('/');
        return slashIndex===-1?'':rel.slice(0,slashIndex+1);
    }

    private _hasJsonNodeExtension(fsPath:string):boolean{
        const ext=path.extname(fsPath);
        return this.jsonExtensions.includes(ext);
    }

    private _hasPathGlob(nodePath:string):boolean{
        return nodePath.includes('*');
    }

    private _getNodeName(nodePath:string):string{
        return nodePath==='/'?'':path.basename(nodePath);
    }

    private _isReservedFsPath(fsPath:string):boolean{
        const rel=path.relative(this.root,fsPath);
        if(rel && !rel.startsWith('..') && !path.isAbsolute(rel)){
            const parts=rel.split(path.sep);
            if(parts.some(part=>part.startsWith('.@db-'))){
                return true;
            }
        }
        return this._isFsPathInDirectory(fsPath,this.edgeDirectory) || this._isFsPathInDirectory(fsPath,this.embeddingsDirectory);
    }

    private _isFsPathInDirectory(fsPath:string,dir:string):boolean{
        const rel=path.relative(dir,fsPath);
        return rel==='' || (!!rel && !rel.startsWith('..') && !path.isAbsolute(rel));
    }
}
