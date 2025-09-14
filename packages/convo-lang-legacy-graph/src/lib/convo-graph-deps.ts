import { defineService } from "@iyio/common";
import { ConvoGraphStore } from "./convo-graph-types.js";

export const convoGraphStore=defineService<ConvoGraphStore>('ConvoGraphStore');
