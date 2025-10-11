import { ConvoMakeAppContentHostMode } from "./convo-make-common-types.js";

export const convoMakeStateDir='.convo-make';
export const convoMakeStatsDir='.convo-make-stats';
export const defaultConvoMakeAppName='default';
export const directUrlConvoMakeAppName='_direct_url';
export const defaultConvoMakeStageName='default';
export const defaultConvoMakePreviewPort=55222;
export const defaultConvoMakeTmpPagesDir='__tmp';
export const defaultConvoMakeAppContentHostMode:ConvoMakeAppContentHostMode='react-page';
export const convoMakeTargetConvoInputEnd=`//_END_MAKE_TARGET_INPUT_`;
export const convoMakeTargetConvoInputEndReg=/\n[ \t]*>[ \t]*nop[ \t]*\r?\n[\r\n \t]*\/\/[ \t]*_END_MAKE_TARGET_INPUT_/;
export const convoMakeTargetShellInputPlaceholder='{CONVO#MAKE#TARGET#SHELL#INPUT/([[[[[[[[[[***(((_)))***]]]]]]]]]])}';
