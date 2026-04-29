import { ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { PromiseResultType } from "../result-type.js";
import { ConvoEmailOtpSignRequestSchema, ConvoEmailPasswordSignRequestSchema, ConvoSignInJwtSchema } from "./convo-db-auth-schemas.js";
import { ConvoEmailOtpSignRequest, ConvoEmailPasswordSignRequest, ConvoSignInJwt } from "./convo-db-auth-types.js";
import { ConvoDb } from "./convo-db-types.js";
import { ConvoDbPermissionBoundary } from "./ConvoDbPermissionBoundary.js";

const localStorageKey='ConvoDbAuthJwt::';

/**
 * An auth helper class. Auth is not directly handled by ConvoDbAuth, it relies on stored database
 * function for auth operations.
 */
export class ConvoDbAuthManager
{

    private readonly _jwt:BehaviorSubject<ConvoSignInJwt|null>=new BehaviorSubject<ConvoSignInJwt|null>(null);
    public get jwtSubject():ReadonlySubject<ConvoSignInJwt|null>{return this._jwt}
    public get jwt(){return this._jwt.value}

    private readonly db:ConvoDb;

    public constructor(db:ConvoDb)
    {
        this.db=db;

        try{
            if(globalThis.localStorage){
                const key=localStorageKey+this.db.dbName;
                const json=globalThis.localStorage.getItem(key);
                if(json){
                    const v=JSON.parse(json);
                    if(v){
                        this._jwt.next(v);
                    }
                }
            }
        }catch(ex){
            console.error('Failed to load JWT from local storage')
        }
    }

    public async signOutAsync()
    {
        this.setJwt(null);
    }

    public async signInEmailOtpAsync(request:ConvoEmailOtpSignRequest):PromiseResultType<ConvoSignInJwt>
    {
        const r=await this.db.callFunctionWithSchemaAsync(
            ConvoEmailOtpSignRequestSchema,
            ConvoSignInJwtSchema,
            '/bin/sign-in-email-otp',
            request
        );

        if(!r.success){
            return r;
        }

        this.setJwt(r.result);

        return {
            success:true,
            result:r.result,
        }
    }

    public async signInEmailPasswordAsync(request:ConvoEmailPasswordSignRequest):PromiseResultType<ConvoSignInJwt>
    {
        const r=await this.db.callFunctionWithSchemaAsync(
            ConvoEmailPasswordSignRequestSchema,
            ConvoSignInJwtSchema,
            '/bin/sign-in-email-password',
            request
        );

        if(!r.success){
            return r;
        }

        this.setJwt(r.result);

        return {
            success:true,
            result:r.result,
        }
    }

    public setJwt(jwt:ConvoSignInJwt|null){

        this._jwt.next(jwt);
        try{
            if(globalThis.localStorage){
                const key=localStorageKey+this.db.dbName;
                globalThis.localStorage.setItem(key,JSON.stringify(jwt));
            }
        }catch(ex){
            console.error('Failed to store JWT in local storage')
        }
    }

    private maxCachedBoundaries=200;
    private boundaryCacheDropRatio=0.3;
    private boundaryCacheCount=0;
    private readonly boundaryCache:Record<string,ConvoDbPermissionBoundary>={}

    /**
     * Create a proxy db with all public methods permissions scoped to the given `permissionFrom`
     * argument.
     * @param permissionFrom The node path where to scope permissions from
     * @param byPass If true no proxy will be created and the db of the auth manager will be returned.
     */
    public createBoundary(permissionFrom:string,byPass=false):ConvoDb
    {
        if(byPass){
            return this.db;
        }

        const cached=this.boundaryCache[permissionFrom];
        if(cached){
            return cached;
        }

        return this._createBoundary(permissionFrom);

    }

    private _createBoundary(permissionFrom:string):ConvoDbPermissionBoundary
    {
        const boundary=new ConvoDbPermissionBoundary({
            proxiedDb:this.db,
            auth:this,
            identityPath: permissionFrom,
        });

        this.boundaryCache[permissionFrom]=boundary;
        this.boundaryCacheCount++;
        if(this.boundaryCacheCount>this.maxCachedBoundaries){
            const all=Object.values(this.boundaryCache);
            all.sort((a,b)=>a.lastUsed-b.lastUsed);
            const end=Math.floor(this.maxCachedBoundaries*this.boundaryCacheDropRatio);
            for(let i=0;i<end;i++){
                const b=all[i];
                if(!b || b===boundary){
                    continue;
                }
                if(this.boundaryCache[b.identityPath]){
                    delete this.boundaryCache[b.identityPath];
                    this.boundaryCacheCount--;
                }
            }
        }

        return boundary;

    }
}
