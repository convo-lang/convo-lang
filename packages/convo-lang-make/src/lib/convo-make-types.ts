import { ConvoMakeActivePass, ConvoMakeApp, ConvoMakeAppContentHostMode, ConvoMakeExplicitReviewType, ConvoMakePass, ConvoMakeStage, ConvoMakeTarget, ConvoMakeTargetDeclaration } from "@convo-lang/convo-lang";
import { Observable } from "rxjs";
import { ConvoMakeCtrl } from "./ConvoMakeCtrl.js";
import { ConvoMakeTargetCtrl } from "./ConvoMakeTargetCtrl.js";

export interface ConvoMakeTargetPair{
    target:ConvoMakeTarget;
    declaration:ConvoMakeTargetDeclaration;
}


export interface ConvoMakeAppTargetRef
{
    /**
     * The referenced app
     */
    app:ConvoMakeApp;

    /**
     * The type of review to be used by the target
     */
    reviewType:ConvoMakeExplicitReviewType;

    /**
     * For http this is the path relative to the web root.
     */
    appPath?:string;

    /**
     * Path relative to app.httpRoot of app that contains the target. For NextJS
     * apps this a tmp page that will render a component
     */
    hostFile?:string;

    /**
     * Determines how hosted content is displayed
     */
    hostMode?:ConvoMakeAppContentHostMode;

    /**
     * Path used to import the component
     */
    importPath?:string
}

export interface ConvoMakeOutputReview
{
    /**
     * A message from the user with comments of the current state of the output.
     */
    message?:string;

    /**
     * If true the user approved of the output.
     */
    approved:boolean;

    /**
     * An error message associated with the output.
     */
    error?:string;

    /**
     * Raw image data of a screenshot of the output.
     */
    screenshot?:Blob;

    /**
     * A screenshot of the output as a base64 url.
     */
    screenshotBase64Url?:string;
}

export interface ConvoMakeShell
{
    /**
     * Starts the execution of a shell command and returns a process object to interact with the process
     */
    execAsync(shellCommand:string):ConvoMakeShellProc;

    /**
     * Checks if a specific port is open
     */
    isPortOpenAsync(port:number):Promise<boolean>;
}

export interface ConvoMakeShellProc
{
    /**
     * Disposes of and kills the process
     */
    dispose():void;

    /**
     * Occurs with the process writes text to stdout
     */
    get onOutput():Observable<string>;

    /**
     * A promise that is completed when the process exits
     */
    exitPromise:Promise<number>;

    /**
     * The exit code of the process or undefined if the process has not exited.
     */
    exitCode?:number;
}

export const allConvoMakeTargetState=['waiting','building','complete','cancelled','skipped'] as const;
export type ConvoMakeTargetState=typeof allConvoMakeTargetState[number];


export interface ConvoMakePassUpdate
{
    addGenCount?:number;
    addSkipCount?:number;
    addCachedCount?:number;
    addForked?:number;
}

type ConvoMakeBuildEvtParams=(
    {
        type:'ctrl-dispose'|'ctrl-complete'|'ctrl-preview';
        target:ConvoMakeCtrl;
    }|{
        type:'target-add'|'target-remove'|'target-dispose';
        target:ConvoMakeTargetCtrl;
    }|{
        type:'target-state-change';
        state:ConvoMakeTargetState;
        target:ConvoMakeTargetCtrl;
    }|{
        type:'pass-start'|'pass-update';
        target:ConvoMakeActivePass;
    }|{
        type:'pass-end';
        target:ConvoMakePass;
    }
)
export type ConvoMakeBuildEvtType=ConvoMakeBuildEvtParams['type'];
export type ConvoMakeBuildEvt={
    type:ConvoMakeBuildEvtType;
    eventTarget:ConvoMakeCtrl|ConvoMakeTargetCtrl|ConvoMakeStage|ConvoMakePass|ConvoMakeActivePass;
    ctrl:ConvoMakeCtrl;
} & ConvoMakeBuildEvtParams;
