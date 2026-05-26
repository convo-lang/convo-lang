import { InMemoryConvoDb, InMemoryConvoDbOptions } from "@convo-lang/db/InMemoryConvoDb.js";

export interface BunEmbeddedFileConvoDbOptions extends InMemoryConvoDbOptions
{
    embeddedMap:Record<string,string>;
}

export class BunEmbeddedFileConvoDb extends InMemoryConvoDb
{

    private readonly embeddedMap:Record<string,string>;

    public constructor({
        embeddedMap,
        ...options
    }:BunEmbeddedFileConvoDbOptions){
        super(options);
        this.embeddedMap=embeddedMap;
    }

    protected override async getBlobFallback(path: string):Promise<Blob|undefined>
    {
        const embedPath=this.embeddedMap[path];
        if(!embedPath){
            return undefined;
        }

        const file=Bun.file(embedPath);

        return new Blob([await file.bytes()]);

    }
}