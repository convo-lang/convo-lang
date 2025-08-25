import type { ConvoMakeExtBuild } from "./ConvoMakeExtBuild";
import type { ConvoMakeExtJson } from "./ConvoMakeExtJson";
import type { ConvoMakeExtLabel } from "./ConvoMakeExtLabel";
import { ConvoMakeExtPass, ConvoMakeExtPassList } from "./ConvoMakeExtPass";
import type { ConvoMakeExtStage, ConvoMakeExtStageList, ConvoMakeExtStageTarget } from "./ConvoMakeExtStage";
import { ConvoMakeExtTarget, ConvoMakeExtTargetList } from "./ConvoMakeExtTarget";
import { ConvoMakeExtTargetDec, ConvoMakeExtTargetDecList } from "./ConvoMakeExtTargetDec";


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
}

export type ConvoMakeExtTreeItemType=keyof ConvoMakeExtItemMetadata;
