import type { ConvoMakeApp } from "@convo-lang/convo-lang";
import type { ConvoMakeCtrl } from "@convo-lang/convo-lang-make";
import type { ConvoMakeExtApp, ConvoMakeExtAppList } from "./ConvoMakeExtApp.js";
import type { ConvoMakeExtBuild } from "./ConvoMakeExtBuild.js";
import type { ConvoMakeExtJson } from "./ConvoMakeExtJson.js";
import type { ConvoMakeExtLabel } from "./ConvoMakeExtLabel.js";
import type { ConvoMakeExtPass, ConvoMakeExtPassList } from "./ConvoMakeExtPass.js";
import type { ConvoMakeExtStage, ConvoMakeExtStageList, ConvoMakeExtStageTarget } from "./ConvoMakeExtStage.js";
import type { ConvoMakeExtTarget, ConvoMakeExtTargetList } from "./ConvoMakeExtTarget.js";
import type { ConvoMakeExtTargetDec, ConvoMakeExtTargetDecList } from "./ConvoMakeExtTargetDec.js";
import { ConvoMakeExtTokenUsage } from "./ConvoMakeExtTokenUsage.js";


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
    tokenUsage?:ConvoMakeExtTokenUsage;
}

export type ConvoMakeExtTreeItemType=keyof ConvoMakeExtItemMetadata;

export interface ConvoMakeAppAndCtrl
{
    app:ConvoMakeApp;
    ctrl:ConvoMakeCtrl;
}
