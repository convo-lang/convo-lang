import { ConvoMakeTarget, escapeConvo } from "@convo-lang/convo-lang";

export const getDefaultConvoMakeTargetSystemMessage=(target:ConvoMakeTarget)=>/*convo*/`
> system
You are generating content that will be directly written to "${escapeConvo(target.out)}".
DO NOT include a preamble or postamble.

Always respond with the full content for "${escapeConvo(target.out)}", even if you are making an
small or incremental update.

`.trim()
