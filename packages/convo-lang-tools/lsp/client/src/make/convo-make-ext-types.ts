import type { ConvoMakeApp } from "@convo-lang/convo-lang";
import type { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import type { ConvoMakeExtApp, ConvoMakeExtAppList } from "./ConvoMakeExtApp";
import type { ConvoMakeExtBuild } from "./ConvoMakeExtBuild";
import type { ConvoMakeExtJson } from "./ConvoMakeExtJson";
import type { ConvoMakeExtLabel } from "./ConvoMakeExtLabel";
import type { ConvoMakeExtPass, ConvoMakeExtPassList } from "./ConvoMakeExtPass";
import type { ConvoMakeExtStage, ConvoMakeExtStageList, ConvoMakeExtStageTarget } from "./ConvoMakeExtStage";
import type { ConvoMakeExtTarget, ConvoMakeExtTargetList } from "./ConvoMakeExtTarget";
import type { ConvoMakeExtTargetDec, ConvoMakeExtTargetDecList } from "./ConvoMakeExtTargetDec";


export interface ConvoMakeExtItemMetadata
{
    build?:ConvoMakeExtBuild;
    stageList?:ConvoMakeExtStageList;
    stage?:ConvoMakeExtStage;
    stageTarget?:ConvoMakeExtStageTarget;
    stageTargetInput?:ConvoMakeExtJson;
    label?:ConvoMakeExtLabel;
    json?:ConvoMakeExtJson;
    pass?:ConvoMakeExtPass;
    passList?:ConvoMakeExtPassList;
    targetDec?:ConvoMakeExtTargetDec;
    targetDecList?:ConvoMakeExtTargetDecList;
    targetList?:ConvoMakeExtTargetList;
    target?:ConvoMakeExtTarget;
    appList?:ConvoMakeExtAppList;
    app?:ConvoMakeExtApp;
}

export type ConvoMakeExtTreeItemType=keyof ConvoMakeExtItemMetadata;

export interface ConvoMakeAppAndCtrl
{
    app:ConvoMakeApp;
    ctrl:ConvoMakeCtrl;
}
