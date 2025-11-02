import { ConvoDocReaderFactory } from "@convo-lang/convo-lang";
import { ConvoPdfDocReader } from "./ConvoPdfDocReader.js";

export const convoPdfDocReaderFactory:ConvoDocReaderFactory=(contentType,url,src)=>{
    return contentType.endsWith('/pdf')?new ConvoPdfDocReader(src):undefined;
}
