import { defineBoolParam, defineStringParam } from "@iyio/common";
import { defaultPineconeAutoCreateIndex, defaultPineconeCloud, defaultPineconeIndex, defaultPineconeIndexKey, defaultPineconeModel, defaultPineconeRegion } from "./pinecone-const";

export const pineconeApiKeyParam=defineStringParam('pineconeApiKey');
export const pineconeIndexParam=defineStringParam('pineconeIndex',defaultPineconeIndex);
export const pineconeAllowedReadIndexesParam=defineStringParam('pineconeAllowedReadIndexes');
export const pineconeAllowedWriteIndexesParam=defineStringParam('pineconeAllowedWriteIndexes');
export const pineconeIndexKeyParam=defineStringParam('pineconeIndexKey',defaultPineconeIndexKey);
export const pineconeCloudParam=defineStringParam('pineconeCloud',defaultPineconeCloud);
export const pineconeRegionParam=defineStringParam('pineconeRegion',defaultPineconeRegion);
export const pineconeModelParam=defineStringParam('pineconeModel',defaultPineconeModel);
export const pineconeIndexMountsParam=defineStringParam('pineconeIndexMounts');
export const pineconeAutoCreateIndexParam=defineBoolParam('pineconeAutoCreateIndex',defaultPineconeAutoCreateIndex);
