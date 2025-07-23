import { convoRagService } from "@convo-lang/convo-lang";
import { ScopeRegistration } from "@iyio/common";
import { ConvoPineconeRagService } from "./ConvoPineconeRagService";

export const convoPineconeModule=(scope:ScopeRegistration)=>{
    scope.implementService(convoRagService,scope=>ConvoPineconeRagService.fromScope(scope));
}
