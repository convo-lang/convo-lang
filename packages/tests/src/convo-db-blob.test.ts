import { describe, expect, test } from 'bun:test';
import { createTestDb } from './createTestDb.js';

const createDb=()=>createTestDb('local-storage');

const readStreamTextAsync=async (stream:ReadableStream):Promise<string>=>{
    return await new Response(stream).text();
};

describe('ConvoDb blob functions',()=>{
    test('hasBlobAsync returns false for missing blobs',async ()=>{
        const db=createDb();
        try{
            const path=`/blob-test/${crypto.randomUUID()}.txt`;

            const has=await db.hasBlobAsync(path);

            expect(has.success).toBe(true);
            if(has.success){
                expect(has.result).toBe(false);
            }
        }finally{
            db.dispose();
        }
    });

    test('writeBlobAsync writes string blobs and openBlobAsync reads them',async ()=>{
        const db=createDb();
        try{
            const path=`/blob-test/${crypto.randomUUID()}.txt`;
            const value='hello blob';

            const write=await db.writeBlobAsync(path,value);
            expect(write.success).toBe(true);

            const has=await db.hasBlobAsync(path);
            expect(has.success).toBe(true);
            if(has.success){
                expect(has.result).toBe(true);
            }

            const open=await db.openBlobAsync(path);
            expect(open.success).toBe(true);
            if(open.success){
                expect(await readStreamTextAsync(open.result)).toBe(value);
            }
        }finally{
            db.dispose();
        }
    });

    test('writeBlobAsync writes Blob values',async ()=>{
        const db=createDb();
        try{
            const path=`/blob-test/${crypto.randomUUID()}.txt`;
            const value='blob value';

            const write=await db.writeBlobAsync(path,new Blob([value],{type:'text/plain'}));
            expect(write.success).toBe(true);

            const open=await db.openBlobAsync(path);
            expect(open.success).toBe(true);
            if(open.success){
                expect(await readStreamTextAsync(open.result)).toBe(value);
            }
        }finally{
            db.dispose();
        }
    });

    test('writeBlobAsync writes ReadableStream values',async ()=>{
        const db=createDb();
        try{
            const path=`/blob-test/${crypto.randomUUID()}.txt`;
            const value='stream value';

            const write=await db.writeBlobAsync(path,new Blob([value]).stream());
            expect(write.success).toBe(true);

            const open=await db.openBlobAsync(path);
            expect(open.success).toBe(true);
            if(open.success){
                expect(await readStreamTextAsync(open.result)).toBe(value);
            }
        }finally{
            db.dispose();
        }
    });

    test('writeBlobAsync overwrites existing blobs',async ()=>{
        const db=createDb();
        try{
            const path=`/blob-test/${crypto.randomUUID()}.txt`;
            const first='first value';
            const second='second value';

            const firstWrite=await db.writeBlobAsync(path,first);
            expect(firstWrite.success).toBe(true);

            const secondWrite=await db.writeBlobAsync(path,second);
            expect(secondWrite.success).toBe(true);

            const open=await db.openBlobAsync(path);
            expect(open.success).toBe(true);
            if(open.success){
                expect(await readStreamTextAsync(open.result)).toBe(second);
            }
        }finally{
            db.dispose();
        }
    });

    test('writeBlobAsync deletes blobs when blob is null',async ()=>{
        const db=createDb();
        try{
            const path=`/blob-test/${crypto.randomUUID()}.txt`;
            const value='delete me';

            const write=await db.writeBlobAsync(path,value);
            expect(write.success).toBe(true);

            const hasBeforeDelete=await db.hasBlobAsync(path);
            expect(hasBeforeDelete.success).toBe(true);
            if(hasBeforeDelete.success){
                expect(hasBeforeDelete.result).toBe(true);
            }

            const del=await db.writeBlobAsync(path,null);
            expect(del.success).toBe(true);

            const hasAfterDelete=await db.hasBlobAsync(path);
            expect(hasAfterDelete.success).toBe(true);
            if(hasAfterDelete.success){
                expect(hasAfterDelete.result).toBe(false);
            }

            const open=await db.openBlobAsync(path);
            expect(open.success).toBe(false);
            if(!open.success){
                expect(open.statusCode).toBe(404);
            }
        }finally{
            db.dispose();
        }
    });
});
