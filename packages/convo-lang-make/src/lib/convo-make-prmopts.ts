import { ConvoMakeTarget, escapeConvo } from "@convo-lang/convo-lang";

export const getDefaultConvoMakeTargetSystemMessage=(target:ConvoMakeTarget)=>/*convo*/`
> system
You are generating content that will be directly written to "${escapeConvo(target.out)}".
DO NOT include a preamble or postamble.

`.trim()
