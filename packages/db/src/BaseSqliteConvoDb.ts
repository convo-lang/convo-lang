import { ConvoDbDriverPathsResult, ConvoNode, ConvoNodeCondition, ConvoNodeEdge, ConvoNodeEdgeQuery, ConvoNodeEdgeQueryResult, ConvoNodeEdgeUpdate, ConvoNodeEmbedding, ConvoNodeEmbeddingQuery, ConvoNodeEmbeddingQueryResult, ConvoNodeEmbeddingUpdate, ConvoNodeOrderBy, ConvoNodePermissionType, ConvoNodePropertyCondition, ConvoNodeQueryStep, ConvoNodeUpdate, isConvoNodeGroupCondition, PromiseResultType, PromiseResultTypeVoid, StatusCode } from "@convo-lang/convo-lang";
import { createPromiseSource, deepClone, getErrorMessage, PromiseSource, uuid } from "@iyio/common";
import { BaseConvoDb, BaseConvoDbOptions } from "./BaseConvoDb.js";

export interface BaseSqliteConvoDbOptions extends BaseConvoDbOptions
{
    nodeTableName?:string;
    edgeTableName?:string;
    embeddingTableName?:string;
}

export abstract class BaseSqliteConvoDb extends BaseConvoDb
{

    public nodeTableName:string;
    public edgeTableName:string;
    public embeddingTableName:string;

    public constructor({
        nodeTableName='node',
        edgeTableName='edge',
        embeddingTableName='embedding',
        ...baseOptions
    }:BaseSqliteConvoDbOptions){
        super(baseOptions);
        validateTableName(nodeTableName,'nodeTableName');
        validateTableName(edgeTableName,'edgeTableName');
        validateTableName(embeddingTableName,'embeddingTableName');
        this.nodeTableName=nodeTableName;
        this.edgeTableName=edgeTableName;
        this.embeddingTableName=embeddingTableName;
    }

    protected initing=false;
    protected inited=false;
    private initPromise:Promise<void>|undefined;
    private initError?:string;
    private initErrorCode?:StatusCode;
    protected waitPromise:PromiseSource<void>|undefined=createPromiseSource<void>();
    private async initAsync()
    {
        this.initing=true;
        try{
            await (this.initPromise??(this.initPromise=this._initAsync()));
        }catch(ex){
            console.error('Failed to init SQLite DB',ex);
            this.initError=getErrorMessage(ex);
        }
    }

    protected async _initAsync()
    {

        await this._execSqlAsync("PRAGMA foreign_keys = ON;");
        await this._execSqlAsync("PRAGMA journal_mode = WAL;");

        const r=await this._execSqlAsync(
            `SELECT name count FROM sqlite_master WHERE type='table' AND name='${this.nodeTableName}' limit 1`
        );

        if(!r.success){
            this.initError=r.error;
            this.initErrorCode=r.statusCode;
            return;
        }

        const hasNodeTable=r.result.length>0;

        if(!hasNodeTable){
            const r=await this.createSchemaAsync();
            if(!r.success){
                this.initError=r.error;
                this.initErrorCode=r.statusCode;
                return;
            }
        }
        this.inited=true;
    }

    protected async createSchemaAsync():PromiseResultTypeVoid
    {
        const sql=this.getSchemaStatements();
        for(const s of sql){
            const r=await this._execSqlAsync(s);
            if(!r.success){
                return r;
            }
        }

        return {success:true}
    }

    protected async execSqlAsync(sql:string,bind?:any[]):PromiseResultType<any[]>
    {
        await this.initAsync();
        if(this.initError){
            return {
                success:false,
                error:this.initError,
                statusCode:this.initErrorCode??500,
            }
        }

        try{
            const r=await this._execSqlAsync(sql,bind);
            if(!r.success){
                console.error('SQLite error',r,new Error().stack);
            }
            return r;
        }catch(ex){
            return {
                success:false,
                error:getErrorMessage(ex),
                statusCode:500,
            }
        }
    }
    protected abstract _execSqlAsync(sql:string,bind?:any[]):PromiseResultType<any[]>;

    public getSchemaStatements():string[]{
        const n=this.nodeTableName;
        const e=this.edgeTableName;
        const m=this.embeddingTableName;
        return [

            // Node Table
            `CREATE TABLE IF NOT EXISTS ${n} (
                path TEXT PRIMARY KEY,
                displayName TEXT,
                name TEXT,
                created TEXT,
                modified TEXT,
                description TEXT,
                instructions TEXT,
                type TEXT NOT NULL,
                data BLOB,
                UNIQUE(path)
            )`,

            // Edge Table
            `CREATE TABLE IF NOT EXISTS ${e} (
                id TEXT PRIMARY KEY,
                displayName TEXT,
                name TEXT,
                description TEXT,
                created TEXT,
                modified TEXT,
                type TEXT NOT NULL,
                "from" TEXT NOT NULL,
                "to" TEXT NOT NULL,
                instructions TEXT,
                grant INTEGER,
                FOREIGN KEY("from") REFERENCES ${n}(path) ON DELETE CASCADE,
                FOREIGN KEY("to") REFERENCES ${n}(path) ON DELETE CASCADE
            )`,

            // Embedding Table
            `CREATE TABLE IF NOT EXISTS ${m} (
                id TEXT PRIMARY KEY,
                prop TEXT NOT NULL,
                name TEXT,
                type TEXT NOT NULL,
                path TEXT NOT NULL,
                description TEXT,
                created TEXT,
                modified TEXT,
                instructions TEXT,
                vector BLOB,
                FOREIGN KEY(path) REFERENCES ${n}(path) ON DELETE CASCADE,
                UNIQUE(path,prop,type)
            )`,
            
            `CREATE INDEX IF NOT EXISTS idx_${n}_type ON ${n}(type)`,
            `CREATE INDEX IF NOT EXISTS idx_${n}_name ON ${n}(name)`,
            `CREATE INDEX IF NOT EXISTS idx_${n}_modified ON ${n}(modified)`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_from ON ${e}("from")`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_to ON ${e}("to")`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_type ON ${e}(type)`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_name ON ${e}(name)`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_from_to ON ${e}("from","to")`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_to_from ON ${e}("to","from")`,
            `CREATE INDEX IF NOT EXISTS idx_${e}_grant ON ${e}(grant)`,
            `CREATE INDEX IF NOT EXISTS idx_${m}_path ON ${m}(path)`,
            `CREATE INDEX IF NOT EXISTS idx_${m}_type ON ${m}(type)`,
            `CREATE INDEX IF NOT EXISTS idx_${m}_name ON ${m}(name)`,
            `CREATE INDEX IF NOT EXISTS idx_${m}_prop ON ${m}(prop)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_${m}_path_prop_type ON ${m}(path,prop,type)`,
        ];
    }

    override _driver={

        selectEdgesByPathsAsync:async (keys:(keyof ConvoNodeEdge)[]|'*',fromPathsIn:string[],toPathsIn:string[],hasGrant:boolean):PromiseResultType<Partial<ConvoNodeEdge>[]>=>{
            if(!fromPathsIn.length || !toPathsIn.length){
                return {
                    success:true,
                    result:[],
                };
            }

            const select=getEdgeSelectColumns(keys);
            const bind:any[]=[];
            const where:string[]=[
                `"from" IN (${fromPathsIn.map(()=>'?').join(',')})`,
                `"to" IN (${toPathsIn.map(()=>'?').join(',')})`,
            ];
            bind.push(...fromPathsIn,...toPathsIn);

            if(hasGrant){
                where.push(`grant IS NOT NULL AND grant != ?`);
                bind.push(ConvoNodePermissionType.none);
            }

            const sql=`SELECT ${select} FROM ${this.edgeTableName} WHERE ${where.join(' AND ')}`;
            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:r.result.map(row=>deserializeEdgeRow(row,keys)),
            };
        },

        selectNodesByPathsAsync:async (keys:(keyof ConvoNode)[]|'*',paths:string[],orderBy:ConvoNodeOrderBy[]):PromiseResultType<Partial<ConvoNode>[]>=>{
            if(!paths.length){
                return {
                    success:true,
                    result:[],
                };
            }

            const select=getNodeSelectColumns(keys);
            const bind:any[]=[...paths];
            const sql=`SELECT ${select} FROM ${this.nodeTableName} WHERE path IN (${paths.map(()=>'?').join(',')}) ${buildNodeOrderByClause(orderBy)}`;
            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:r.result.map(row=>deserializeNodeRow(row,keys)),
            };
        },
        
        selectNodePathsForPathAsync:async (step:Required<Pick<ConvoNodeQueryStep,'path'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const bind:any[]=[];
            const where:string[]=[];
            appendCurrentNodePathsFilter(where,bind,currentNodePaths,'path');

            if(step.path.endsWith('/*')){
                const prefix=step.path.substring(0,step.path.length-1);
                where.push(`path LIKE ?`);
                bind.push(`${prefix}%`);
                where.push(`path != ?`);
                bind.push(prefix.substring(0,prefix.length-1));
            }else{
                where.push(`path = ?`);
                bind.push(step.path);
            }

            const sql=`SELECT path FROM ${this.nodeTableName}${where.length?` WHERE ${where.join(' AND ')}`:''} ${buildNodeOrderByClause(orderBy)} LIMIT ? OFFSET ?`;
            bind.push(limit,offset);

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:{paths:r.result.map(v=>String(v.path))}
            };
        },

        selectNodePathsForConditionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'condition'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const bind:any[]=[];
            const where:string[]=[];

            appendCurrentNodePathsFilter(where,bind,currentNodePaths,'path');

            const conditionSql=buildConditionSql(step.condition,'node',bind);
            where.push(conditionSql);

            const sql=`SELECT path FROM ${this.nodeTableName}${where.length?` WHERE ${where.join(' AND ')}`:''} ${buildNodeOrderByClause(orderBy)} LIMIT ? OFFSET ?`;
            bind.push(limit,offset);

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:{paths:r.result.map(v=>String(v.path))}
            };
        },

        selectNodePathsForPermissionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'permissionFrom'|'permissionRequired'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const bind:any[]=[
                step.permissionFrom,
                ConvoNodePermissionType.none,
            ];
            const where:string[]=[];

            appendCurrentNodePathsFilter(where,bind,currentNodePaths,'n.path');

            const sql=`SELECT n.path, e.grant
                FROM ${this.nodeTableName} n
                LEFT JOIN ${this.edgeTableName} e
                    ON e."from" = ?
                    AND e.grant IS NOT NULL
                    AND e.grant != ?
                    AND (n.path = e."to" OR n.path LIKE (e."to" || '/%'))
                ${where.length?`WHERE ${where.join(' AND ')}`:''}
                GROUP BY n.path
                ${buildNodeOrderByClause(orderBy,'n')}
                LIMIT ? OFFSET ?`;
            bind.push(limit,offset);

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:{paths:r.result.filter(v=>(v.grant&step.permissionRequired)===step.permissionRequired).map(v=>String(v.path))}
            };
        },

        selectNodePathsForEmbeddingAsync:async (step:Required<Pick<ConvoNodeQueryStep,'embedding'>>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const embeddingResult=await this.generateEmbeddingsAsync({
                ...this.embeddingOptions,
                text:step.embedding.text,
            });
            if(!embeddingResult.success){
                return embeddingResult;
            }

            const queryVector=embeddingResult.result.embedding;
            const bind:any[]=[];
            const where:string[]=[];

            if(step.embedding.type!==undefined){
                where.push(`e.type = ?`);
                bind.push(step.embedding.type);
            }

            appendCurrentNodePathsFilter(where,bind,currentNodePaths,'n.path');

            const tolerance=step.embedding.tolerance??1;
            const distanceExpr=`vec_distance_l2(e.vector, ?)`;
            bind.unshift(queryVector);

            where.push(`e.vector IS NOT NULL`);
            where.push(`${distanceExpr} <= ?`);
            bind.push(tolerance);

            const sql=`SELECT DISTINCT n.path
                FROM ${this.nodeTableName} n
                INNER JOIN ${this.embeddingTableName} e ON e.path = n.path
                WHERE ${where.join(' AND ')}
                ORDER BY ${distanceExpr} ASC${buildOrderBySuffix(orderBy,'n')}
                LIMIT ? OFFSET ?`;
            bind.push(queryVector,limit,offset);

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:{paths:r.result.map(v=>String(v.path))}
            };
        },

        selectEdgeNodePathsForConditionAsync:async (step:Required<Pick<ConvoNodeQueryStep,'edge'|'edgeDirection'>>&Pick<ConvoNodeQueryStep,'edgeLimit'>,currentNodePaths:string[]|null,orderBy:ConvoNodeOrderBy[],limit:number,offset:number):PromiseResultType<ConvoDbDriverPathsResult>=>{
            const bind:any[]=[];
            const directionParts:string[]=[];

            const currentSourceSql=currentNodePaths===null?
                `SELECT path FROM ${this.nodeTableName}`
            :
                `SELECT path FROM ${this.nodeTableName} WHERE path IN (${currentNodePaths.map(()=>'?').join(',')})`;

            if(currentNodePaths!==null){
                bind.push(...currentNodePaths);
            }

            if(step.edgeDirection==='forward' || step.edgeDirection==='bi'){
                directionParts.push(`SELECT e."to" AS path
                    FROM ${this.edgeTableName} e
                    INNER JOIN current_nodes c ON c.path = e."from"
                    ${buildEdgeConditionWhereClause(step.edge,bind,true)}`);
            }

            if(step.edgeDirection==='reverse' || step.edgeDirection==='bi'){
                directionParts.push(`SELECT e."from" AS path
                    FROM ${this.edgeTableName} e
                    INNER JOIN current_nodes c ON c.path = e."to"
                    ${buildEdgeConditionWhereClause(step.edge,bind,true)}`);
            }

            const innerLimit=step.edgeLimit===undefined?'':` LIMIT ${Math.max(0,step.edgeLimit)} `;

            const sql=`WITH current_nodes AS (${currentSourceSql}),
                traversed AS (
                    ${directionParts.join(' UNION ')}
                )
                SELECT DISTINCT n.path
                FROM ${this.nodeTableName} n
                INNER JOIN (
                    SELECT DISTINCT path FROM traversed${innerLimit}
                ) t ON t.path = n.path
                ${buildNodeOrderByClause(orderBy,'n')}
                LIMIT ? OFFSET ?`;
            bind.push(limit,offset);

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:{paths:r.result.map(v=>String(v.path))}
            };
        },

        insertNodeAsync:async (node:ConvoNode,options:Omit<any,'permissionFrom'>|undefined):PromiseResultType<ConvoNode>=>{
            const n=node;
            const sql=`INSERT INTO ${this.nodeTableName} (
                path, displayName, name, created, modified, description, instructions, type, data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING path, displayName, name, created, modified, description, instructions, type, data`;
            const bind=[
                n.path,
                n.displayName??null,
                n.name??null,
                n.created??null,
                n.modified??null,
                n.description??null,
                n.instructions??null,
                n.type??null,
                serializeValue(n.data),
            ];

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:deserializeNodeRow(r.result[0],'*') as ConvoNode,
            };
        },

        updateNodeAsync:async (node:ConvoNodeUpdate,options:Omit<any,'permissionFrom'|'mergeData'>|undefined):PromiseResultTypeVoid=>{
            const sets:string[]=[];
            const bind:any[]=[];

            if(node.displayName!==undefined){
                sets.push(`displayName = ?`);
                bind.push(node.displayName);
            }
            if(node.modified!==undefined){
                sets.push(`modified = ?`);
                bind.push(node.modified);
            }
            if(node.description!==undefined){
                sets.push(`description = ?`);
                bind.push(node.description);
            }
            if(node.instructions!==undefined){
                sets.push(`instructions = ?`);
                bind.push(node.instructions);
            }
            if(node.data!==undefined){
                sets.push(`data = ?`);
                bind.push(serializeValue(node.data));
            }

            if(!sets.length){
                return {success:true};
            }

            bind.push(node.path);

            const sql=`UPDATE ${this.nodeTableName} SET ${sets.join(', ')} WHERE path = ?`;
            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {success:true};
        },

        deleteNodeAsync:async (path:string,options:Omit<any,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const sql=`DELETE FROM ${this.nodeTableName} WHERE path = ?`;
            const r=await this.execSqlAsync(sql,[path]);
            if(!r.success){
                return r;
            }
            return {success:true};
        },

        insertEdgeAsync:async (edge:Omit<ConvoNodeEdge,"id">,options:Omit<any,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEdge>=>{
            const id=uuid();
            const e=deepClone(edge);
            const sql=`INSERT INTO ${this.edgeTableName} (
                id, displayName, name, description, created, modified, type, "from", "to", instructions, grant
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, displayName, name, description, created, modified, type, "from", "to", instructions, grant`;
            const bind=[
                id,
                e.displayName??null,
                e.name??null,
                e.description??null,
                e.created??null,
                e.modified??null,
                e.type,
                e.from,
                e.to,
                e.instructions??null,
                e.grant??null,
            ];

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:deserializeEdgeRow(r.result[0],'*') as ConvoNodeEdge,
            };
        },

        updateEdgeAsync:async (update:ConvoNodeEdgeUpdate,options:Omit<any,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const sets:string[]=[];
            const bind:any[]=[];

            if(update.displayName!==undefined){
                sets.push(`displayName = ?`);
                bind.push(update.displayName);
            }
            if(update.modified!==undefined){
                sets.push(`modified = ?`);
                bind.push(update.modified);
            }
            if(update.description!==undefined){
                sets.push(`description = ?`);
                bind.push(update.description);
            }
            if(update.instructions!==undefined){
                sets.push(`instructions = ?`);
                bind.push(update.instructions);
            }
            if(update.grant!==undefined){
                sets.push(`grant = ?`);
                bind.push(update.grant);
            }

            if(!sets.length){
                return {success:true};
            }

            bind.push(update.id);

            const sql=`UPDATE ${this.edgeTableName} SET ${sets.join(', ')} WHERE id = ?`;
            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {success:true};
        },

        deleteEdgeAsync:async (id:string,options:Omit<any,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const sql=`DELETE FROM ${this.edgeTableName} WHERE id = ?`;
            const r=await this.execSqlAsync(sql,[id]);
            if(!r.success){
                return r;
            }
            return {success:true};
        },

        insertEmbeddingAsync:async (embedding:Omit<ConvoNodeEmbedding,"id">,options:Omit<any,'permissionFrom'>|undefined):PromiseResultType<ConvoNodeEmbedding>=>{
            const id=uuid();
            const e=deepClone(embedding);

            let vector=e.vector;
            if(vector===undefined && (options as any)?.generateVector!==false){
                const vectorResult=await this.generateEmbeddingVectorAsync({
                    ...e,
                    id,
                });
                if(!vectorResult.success){
                    return vectorResult;
                }
                vector=vectorResult.result;
            }

            const sql=`INSERT INTO ${this.embeddingTableName} (
                id, prop, name, type, path, description, created, modified, instructions, vector
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, prop, name, type, path, description, created, modified, instructions, vector`;
            const bind=[
                id,
                e.prop,
                e.name??null,
                e.type,
                e.path,
                e.description??null,
                e.created??null,
                e.modified??null,
                e.instructions??null,
                serializeValue(vector),
            ];

            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {
                success:true,
                result:deserializeEmbeddingRow(r.result[0],true) as ConvoNodeEmbedding,
            };
        },

        deleteEmbeddingAsync:async (id:string,options:Omit<any,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const sql=`DELETE FROM ${this.embeddingTableName} WHERE id = ?`;
            const r=await this.execSqlAsync(sql,[id]);
            if(!r.success){
                return r;
            }
            return {success:true};
        },

        updateEmbeddingAsync:async (update:ConvoNodeEmbeddingUpdate,options:Omit<any,'permissionFrom'>|undefined):PromiseResultTypeVoid=>{
            const currentResult=await this.getEmbeddingByIdAsync(update.id);
            if(!currentResult.success){
                return currentResult;
            }

            const sets:string[]=[];
            const bind:any[]=[];

            if(update.modified!==undefined){
                sets.push(`modified = ?`);
                bind.push(update.modified);
            }
            if(update.description!==undefined){
                sets.push(`description = ?`);
                bind.push(update.description);
            }
            if(update.instructions!==undefined){
                sets.push(`instructions = ?`);
                bind.push(update.instructions);
            }

            let vectorUpdated=false;
            if(update.generateVector){
                const nextEmbedding:ConvoNodeEmbedding={
                    ...currentResult.result,
                    modified:update.modified===undefined?currentResult.result.modified:update.modified??undefined,
                    description:update.description===undefined?currentResult.result.description:update.description??undefined,
                    instructions:update.instructions===undefined?currentResult.result.instructions:update.instructions??undefined,
                };
                const vectorResult=await this.generateEmbeddingVectorAsync(nextEmbedding);
                if(!vectorResult.success){
                    return vectorResult;
                }
                sets.push(`vector = ?`);
                bind.push(serializeValue(vectorResult.result));
                vectorUpdated=true;
            }

            if(!sets.length && !vectorUpdated){
                return {success:true};
            }

            bind.push(update.id);

            const sql=`UPDATE ${this.embeddingTableName} SET ${sets.join(', ')} WHERE id = ?`;
            const r=await this.execSqlAsync(sql,bind);
            if(!r.success){
                return r;
            }

            return {success:true};
        },

        queryEdgesAsync:async (query: ConvoNodeEdgeQuery):PromiseResultType<ConvoNodeEdgeQueryResult>=>{
            const where:string[]=[];
            const bind:any[]=[];

            if(query.id!==undefined){
                where.push(`id = ?`);
                bind.push(query.id);
            }
            if(query.from!==undefined){
                where.push(`"from" = ?`);
                bind.push(query.from);
            }
            if(query.to!==undefined){
                where.push(`"to" = ?`);
                bind.push(query.to);
            }
            if(query.type!==undefined){
                where.push(`type = ?`);
                bind.push(query.type);
            }
            if(query.name!==undefined){
                where.push(`name = ?`);
                bind.push(query.name);
            }

            if(query.permissionFrom!==undefined){
                where.push(`EXISTS (
                    SELECT 1
                    FROM ${this.edgeTableName} ef
                    WHERE ef."from" = ?
                        AND ef.grant IS NOT NULL
                        AND ef.grant != ?
                        AND ((ef.grant & ?) = ?)
                        AND ("from" = ef."to" OR "from" LIKE (ef."to" || '/%'))
                )`);
                bind.push(query.permissionFrom,ConvoNodePermissionType.none,ConvoNodePermissionType.read,ConvoNodePermissionType.read);

                where.push(`EXISTS (
                    SELECT 1
                    FROM ${this.edgeTableName} et
                    WHERE et."from" = ?
                        AND et.grant IS NOT NULL
                        AND et.grant != ?
                        AND ((et.grant & ?) = ?)
                        AND ("to" = et."to" OR "to" LIKE (et."to" || '/%'))
                )`);
                bind.push(query.permissionFrom,ConvoNodePermissionType.none,ConvoNodePermissionType.read,ConvoNodePermissionType.read);
            }

            const limit=query.limit??50;
            const offset=query.offset??0;

            const sql=`SELECT id, displayName, name, description, created, modified, type, "from", "to", instructions, grant
                FROM ${this.edgeTableName}
                ${where.length?`WHERE ${where.join(' AND ')}`:''}
                ORDER BY id ASC
                LIMIT ? OFFSET ?`;
            const r=await this.execSqlAsync(sql,[...bind,limit,offset]);
            if(!r.success){
                return r;
            }

            let total:number|undefined;
            if(query.includeTotal){
                const totalSql=`SELECT COUNT(*) AS total
                    FROM ${this.edgeTableName}
                    ${where.length?`WHERE ${where.join(' AND ')}`:''}`;
                const totalResult=await this.execSqlAsync(totalSql,bind);
                if(!totalResult.success){
                    return totalResult;
                }
                total=Number(totalResult.result[0]?.total??0);
            }

            return {
                success:true,
                result:{
                    edges:r.result.map(row=>deserializeEdgeRow(row,'*') as ConvoNodeEdge),
                    total,
                }
            };
        },

        queryEmbeddingsAsync:async (query:ConvoNodeEmbeddingQuery):PromiseResultType<ConvoNodeEmbeddingQueryResult>=>{
            const where:string[]=[];
            const bind:any[]=[];

            if(query.id!==undefined){
                where.push(`id = ?`);
                bind.push(query.id);
            }
            if(query.path!==undefined){
                where.push(`path = ?`);
                bind.push(query.path);
            }
            if(query.type!==undefined){
                where.push(`type = ?`);
                bind.push(query.type);
            }
            if(query.name!==undefined){
                where.push(`name = ?`);
                bind.push(query.name);
            }
            if(query.prop!==undefined){
                where.push(`prop = ?`);
                bind.push(query.prop);
            }

            if(query.permissionFrom!==undefined){
                where.push(`EXISTS (
                    SELECT 1
                    FROM ${this.edgeTableName} e
                    WHERE e."from" = ?
                        AND e.grant IS NOT NULL
                        AND e.grant != ?
                        AND ((e.grant & ?) = ?)
                        AND (path = e."to" OR path LIKE (e."to" || '/%'))
                )`);
                bind.push(query.permissionFrom,ConvoNodePermissionType.none,ConvoNodePermissionType.read,ConvoNodePermissionType.read);
            }

            const limit=query.limit??50;
            const offset=query.offset??0;
            const vectorSelect=query.includeVector?'vector':'NULL AS vector';

            const sql=`SELECT id, prop, name, type, path, description, created, modified, instructions, ${vectorSelect}
                FROM ${this.embeddingTableName}
                ${where.length?`WHERE ${where.join(' AND ')}`:''}
                ORDER BY id ASC
                LIMIT ? OFFSET ?`;
            const r=await this.execSqlAsync(sql,[...bind,limit,offset]);
            if(!r.success){
                return r;
            }

            let total:number|undefined;
            if(query.includeTotal){
                const totalSql=`SELECT COUNT(*) AS total
                    FROM ${this.embeddingTableName}
                    ${where.length?`WHERE ${where.join(' AND ')}`:''}`;
                const totalResult=await this.execSqlAsync(totalSql,bind);
                if(!totalResult.success){
                    return totalResult;
                }
                total=Number(totalResult.result[0]?.total??0);
            }

            return {
                success:true,
                result:{
                    embeddings:r.result.map(row=>deserializeEmbeddingRow(row,!!query.includeVector) as ConvoNodeEmbedding),
                    total,
                }
            };
        },
    }
}

const validateTableName=(name:string,label:string)=>{
    if(!/^[A-Za-z0-9_]+$/.test(name)){
        throw new Error(`Invalid ${label}. Only letters, numbers and underscores are allowed - ${name}`);
    }
}

const serializeValue=(value:any):any=>{
    if(value===undefined){
        return null;
    }
    if(value===null){
        return null;
    }
    if(value instanceof Uint8Array){
        return value;
    }
    if(typeof Buffer!=='undefined' && (value instanceof Buffer)){
        return value;
    }
    if(typeof value==='string'){
        return value;
    }
    return Buffer.from(JSON.stringify(value))
}

const deserializeBlobJsonValue=(value:any):any=>{
    if(value===undefined || value===null){
        return value;
    }
    if(typeof value==='string'){
        try{
            return JSON.parse(value);
        }catch{
            return value;
        }
    }
    if(value instanceof Uint8Array || (value instanceof Buffer)){
        const text=((value instanceof Buffer)?value:Buffer.from(value)).toString('utf8');
        try{
            return JSON.parse(text);
        }catch{
            return value;
        }
    }
    return value;
}

const deserializeNodeRow=(row:any,keys:(keyof ConvoNode)[]|'*'):Partial<ConvoNode>=>{
    const node:any={};
    const include=(k:keyof ConvoNode)=>keys==='*' || keys.includes(k);

    if(include('path')){node.path=row.path;}
    if(include('displayName')){node.displayName=row.displayName??undefined;}
    if(include('name')){node.name=row.name??undefined;}
    if(include('created')){node.created=row.created??undefined;}
    if(include('modified')){node.modified=row.modified??undefined;}
    if(include('description')){node.description=row.description??undefined;}
    if(include('instructions')){node.instructions=row.instructions??undefined;}
    if(include('type')){node.type=row.type;}
    if(include('data')){node.data=deserializeBlobJsonValue(row.data);}
    return node;
}

const deserializeEdgeRow=(row:any,keys:(keyof ConvoNodeEdge)[]|'*'):Partial<ConvoNodeEdge>=>{
    const edge:any={};
    const include=(k:keyof ConvoNodeEdge)=>keys==='*' || keys.includes(k);

    if(include('id')){edge.id=row.id;}
    if(include('displayName')){edge.displayName=row.displayName??undefined;}
    if(include('name')){edge.name=row.name??undefined;}
    if(include('description')){edge.description=row.description??undefined;}
    if(include('created')){edge.created=row.created??undefined;}
    if(include('modified')){edge.modified=row.modified??undefined;}
    if(include('type')){edge.type=row.type;}
    if(include('from')){edge.from=row.from;}
    if(include('to')){edge.to=row.to;}
    if(include('instructions')){edge.instructions=row.instructions??undefined;}
    if(include('grant')){edge.grant=row.grant??undefined;}
    return edge;
}

const deserializeEmbeddingRow=(row:any,includeVector:boolean):Partial<ConvoNodeEmbedding>=>{
    const embedding:any={
        id:row.id,
        prop:row.prop,
        name:row.name??undefined,
        type:row.type,
        path:row.path,
        description:row.description??undefined,
        created:row.created??undefined,
        modified:row.modified??undefined,
        instructions:row.instructions??undefined,
    };
    if(includeVector){
        embedding.vector=deserializeBlobJsonValue(row.vector);
    }
    return embedding;
}

const getNodeSelectColumns=(keys:(keyof ConvoNode)[]|'*'):string=>{
    if(keys==='*'){
        return `path, displayName, name, created, modified, description, instructions, type, data`;
    }
    return keys.map(getNodeColumnName).join(', ');
}

const getEdgeSelectColumns=(keys:(keyof ConvoNodeEdge)[]|'*'):string=>{
    if(keys==='*'){
        return `id, displayName, name, description, created, modified, type, "from" AS "from", "to" AS "to", instructions, grant`;
    }
    return keys.map(getEdgeColumnName).join(', ');
}

const getNodeColumnName=(key:keyof ConvoNode):string=>{
    switch(key){
        case 'path': return 'path';
        case 'displayName': return 'displayName';
        case 'name': return 'name';
        case 'created': return 'created';
        case 'modified': return 'modified';
        case 'description': return 'description';
        case 'instructions': return 'instructions';
        case 'type': return 'type';
        case 'data': return 'data';
    }
}

const getEdgeColumnName=(key:keyof ConvoNodeEdge):string=>{
    switch(key){
        case 'id': return 'id';
        case 'displayName': return 'displayName';
        case 'name': return 'name';
        case 'description': return 'description';
        case 'created': return 'created';
        case 'modified': return 'modified';
        case 'type': return 'type';
        case 'from': return `"from" AS "from"`;
        case 'to': return `"to" AS "to"`;
        case 'instructions': return 'instructions';
        case 'grant': return 'grant';
    }
}

const appendCurrentNodePathsFilter=(where:string[],bind:any[],currentNodePaths:string[]|null,columnName:string)=>{
    if(currentNodePaths && currentNodePaths.length===0){
        where.push(`1 = 0`);
        return;
    }
    if(currentNodePaths){
        where.push(`${columnName} IN (${currentNodePaths.map(()=>'?').join(',')})`);
        bind.push(...currentNodePaths);
    }
}

const buildNodeOrderByClause=(orderBy:ConvoNodeOrderBy[],alias='')=>{
    if(!orderBy.length){
        return '';
    }
    const prefix=alias?`${alias}.`:'';
    return ` ORDER BY ${orderBy.map(o=>`${getNodeOrderExpression(o.prop,prefix)} ${o.direction==='desc'?'DESC':'ASC'}`).join(', ')}`;
}

const buildOrderBySuffix=(orderBy:ConvoNodeOrderBy[],alias='')=>{
    if(!orderBy.length){
        return '';
    }
    const prefix=alias?`${alias}.`:'';
    return `, ${orderBy.map(o=>`${getNodeOrderExpression(o.prop,prefix)} ${o.direction==='desc'?'DESC':'ASC'}`).join(', ')}`;
}

const getNodeOrderExpression=(prop:string,prefix:string)=>{
    if(isNodeColumn(prop)){
        return `${prefix}${prop}`;
    }
    if(prop.startsWith('data.')){
        return `json_extract(CAST(${prefix}data AS TEXT), ${toJsonPath(prop.substring(5))})`;
    }
    return `${prefix}path`;
}

const isNodeColumn=(prop:string)=>{
    return (
        prop==='path' ||
        prop==='displayName' ||
        prop==='name' ||
        prop==='created' ||
        prop==='modified' ||
        prop==='description' ||
        prop==='instructions' ||
        prop==='type' ||
        prop==='data'
    );
}

const buildConditionSql=(condition:ConvoNodeCondition,targetType:'node'|'edge',bind:any[]):string=>{
    if(isConvoNodeGroupCondition(condition)){
        if(!condition.conditions.length){
            return '(1 = 0)';
        }
        const op=condition.groupOp==='or'?' OR ':' AND ';
        return `(${condition.conditions.map(c=>buildConditionSql(c,targetType,bind)).join(op)})`;
    }
    return buildPropertyConditionSql(condition,targetType,bind);
}

const buildPropertyConditionSql=(condition:ConvoNodePropertyCondition,targetType:'node'|'edge',bind:any[]):string=>{
    const left=getSqlTargetExpression(condition.target,targetType);
    switch(condition.op){
        case '=':
            bind.push(serializeConditionValue(condition.value));
            return `(${left} = ?)`;
        case '!=':
            bind.push(serializeConditionValue(condition.value));
            return `(${left} != ?)`;
        case '>':
            bind.push(serializeConditionValue(condition.value));
            return `(${left} > ?)`;
        case '<':
            bind.push(serializeConditionValue(condition.value));
            return `(${left} < ?)`;
        case '>=':
            bind.push(serializeConditionValue(condition.value));
            return `(${left} >= ?)`;
        case '<=':
            bind.push(serializeConditionValue(condition.value));
            return `(${left} <= ?)`;
        case 'like':
            bind.push(wildcardToSqlLike(String(condition.value)));
            return `(${left} LIKE ? ESCAPE '\\')`;
        case 'ilike':
            bind.push(wildcardToSqlLike(String(condition.value)).toLowerCase());
            return `(LOWER(CAST(${left} AS TEXT)) LIKE ? ESCAPE '\\')`;
        case 'in':
            return buildInCondition(left,condition.value,bind,false);
        case 'all-in':
            return buildJsonArrayCompareCondition(left,condition.value,bind,'all-in');
        case 'any-in':
            return buildJsonArrayCompareCondition(left,condition.value,bind,'any-in');
        case 'contains':
            return buildContainsCondition(left,condition.value,bind);
        case 'contains-all':
            return buildJsonArrayCompareCondition(left,condition.value,bind,'contains-all');
        case 'contains-any':
            return buildJsonArrayCompareCondition(left,condition.value,bind,'contains-any');
        default:
            bind.push(serializeConditionValue(condition.value));
            return `(${left} = ?)`;
    }
}

const buildInCondition=(left:string,value:any,bind:any[],strictArray:boolean):string=>{
    if(!Array.isArray(value)){
        return '(1 = 0)';
    }
    if(!value.length){
        return '(1 = 0)';
    }
    const values=value.map(v=>serializeConditionValue(v));
    bind.push(...values);
    return `(${left} IN (${values.map(()=>'?').join(',')}))`;
}

const buildContainsCondition=(left:string,value:any,bind:any[]):string=>{
    bind.push(value);
    return `(json_valid(CAST(${left} AS TEXT)) AND json_type(CAST(${left} AS TEXT))='array' AND EXISTS (
        SELECT 1 FROM json_each(CAST(${left} AS TEXT)) je WHERE je.value = ?
    ))`;
}

const buildJsonArrayCompareCondition=(left:string,value:any,bind:any[],op:'all-in'|'any-in'|'contains-all'|'contains-any'):string=>{
    if(!Array.isArray(value)){
        return '(1 = 0)';
    }
    const valueJson=serializeJsonText(value);
    bind.push(valueJson);

    switch(op){
        case 'all-in':
            return `(
                json_valid(CAST(${left} AS TEXT)) AND json_type(CAST(${left} AS TEXT))='array'
                AND NOT EXISTS (
                    SELECT 1
                    FROM json_each(CAST(${left} AS TEXT)) l
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM json_each(?) r
                        WHERE json(r.value)=json(l.value)
                    )
                )
            )`;
        case 'any-in':
            return `(
                json_valid(CAST(${left} AS TEXT)) AND json_type(CAST(${left} AS TEXT))='array'
                AND EXISTS (
                    SELECT 1
                    FROM json_each(CAST(${left} AS TEXT)) l
                    WHERE EXISTS (
                        SELECT 1
                        FROM json_each(?) r
                        WHERE json(r.value)=json(l.value)
                    )
                )
            )`;
        case 'contains-all':
            return `(
                json_valid(CAST(${left} AS TEXT)) AND json_type(CAST(${left} AS TEXT))='array'
                AND NOT EXISTS (
                    SELECT 1
                    FROM json_each(?) r
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM json_each(CAST(${left} AS TEXT)) l
                        WHERE json(l.value)=json(r.value)
                    )
                )
            )`;
        case 'contains-any':
            return `(
                json_valid(CAST(${left} AS TEXT)) AND json_type(CAST(${left} AS TEXT))='array'
                AND EXISTS (
                    SELECT 1
                    FROM json_each(?) r
                    WHERE EXISTS (
                        SELECT 1
                        FROM json_each(CAST(${left} AS TEXT)) l
                        WHERE json(l.value)=json(r.value)
                    )
                )
            )`;
    }
}

const getSqlTargetExpression=(target:string,targetType:'node'|'edge'):string=>{
    if(targetType==='node'){
        if(isNodeColumn(target)){
            return target;
        }
        if(target.startsWith('data.')){
            return `json_extract(CAST(data AS TEXT), ${toJsonPath(target.substring(5))})`;
        }
        return 'NULL';
    }else{
        if(isEdgeColumn(target)){
            if(target==='from'){
                return `"from"`;
            }
            if(target==='to'){
                return `"to"`;
            }
            return target;
        }
        return 'NULL';
    }
}

const isEdgeColumn=(prop:string)=>{
    return (
        prop==='id' ||
        prop==='displayName' ||
        prop==='name' ||
        prop==='description' ||
        prop==='created' ||
        prop==='modified' ||
        prop==='type' ||
        prop==='from' ||
        prop==='to' ||
        prop==='instructions' ||
        prop==='grant'
    );
}

const toJsonPath=(path:string)=>{
    const parts=path.split('.').filter(Boolean);
    return `'$.${parts.map(escapeJsonPathPart).join('.')}'`;
}

const escapeJsonPathPart=(part:string)=>{
    return part.replace(/'/g,"''");
}

const wildcardToSqlLike=(value:string)=>{
    return value.replace(/\\/g,'\\\\').replace(/%/g,'\\%').replace(/_/g,'\\_').replace(/\*/g,'%');
}

const serializeConditionValue=(value:any)=>{
    if(Array.isArray(value) || (value && typeof value==='object')){
        return JSON.stringify(value);
    }
    return value;
}

const serializeJsonText=(value:any)=>{
    return JSON.stringify(value);
}

const buildEdgeConditionWhereClause=(edge:string|ConvoNodeCondition,bind:any[],includeWhere:boolean)=>{
    const condition=(typeof edge==='string'?
        {
            target:'type',
            op:'=',
            value:edge,
        } satisfies ConvoNodePropertyCondition
    :
        edge
    );
    const sql=buildConditionSql(condition,'edge',bind);
    return includeWhere?`WHERE ${sql}`:sql;
}
