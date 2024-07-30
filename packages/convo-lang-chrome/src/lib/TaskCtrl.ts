import { Conversation, escapeConvoMessageContent, getConvoTextCompletionAsync } from "@convo-lang/convo-lang";
import { ReadonlySubject } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { BaseConvoChromeCtrl } from "./BaseConvoChromeCtrl";
import { actionStateToCsvMd } from "./action-state-lib";
import { ConvoTaskState } from "./convo-chrome-types";

export interface TaskExecuteOptions
{
    /**
     * Should return a base64 image of the current screen
     */
    getScreenShotAsync:()=>Promise<string>;
}

export interface TaskCtrlOptions
{
    task:ConvoTaskState;
    parentCtrl:BaseConvoChromeCtrl;
}

export class TaskCtrl
{
    public readonly id:string;

    private readonly _state:BehaviorSubject<ConvoTaskState>;
    public get stateSubject():ReadonlySubject<ConvoTaskState>{return this._state}
    public get state(){return this._state.value}
    public set state(value:ConvoTaskState){
        if(value==this._state.value){
            return;
        }
        this._state.next(value);
    }

    private readonly parentCtrl:BaseConvoChromeCtrl;

    public constructor({
        task,
        parentCtrl,
    }:TaskCtrlOptions){
        this.id=task.id;
        this._state=new BehaviorSubject<ConvoTaskState>(task);
        this.parentCtrl=parentCtrl;
    }

    public async executeAsync(options:TaskExecuteOptions)
    {
        const getStrategyAsync=async ()=>{

            const [actionState,img]=await Promise.all([
                this.parentCtrl.sendReceiveMessageAsync(
                    this.id,'getActionState','returnActionState'
                ),
                options.getScreenShotAsync()
            ]);

            console.log('hio 👋 👋 👋 init action state',actionState,img);

            const strategy=await getConvoTextCompletionAsync(/*convo*/`
                > define
                __model='gpt-4-vision-preview'

                > system
                You are assisting a user to complete tasks using a web browser.

                Task:
                ${escapeConvoMessageContent(this.state.userPrompt)}

                Current View State:
                ${escapeConvoMessageContent(actionStateToCsvMd(actionState))}

                > user
                Below is an screen shot of the current tab.
                ![screen shot](${img})

                > user
                Generate an instruction for the current step based on the current view state. The instruction
                should include details about switch items in the view state should be interacted with
                including their ids.

                Include text to enter into text fields if the steps include entering text. Display
                text in a markdown code block and with multiple lines if the text format needs
                multiple lines.
                For example if replying to an email include the text for the email.

            `)

            console.log('hio 👋 👋 👋 strategy',strategy);

            if(!strategy){
                throw new Error('Strategy generation failed');
            }

            return {strategy,actionState};
        }


        let completed=false;
        let failed=false;

        const convo=new Conversation();

        convo.append(/*convo*/`
            > define
            __model='gpt-4-1106-preview'

            > system
            You are assisting a user to complete tasks using a web browser

            The user will give you a "View State" and a Strategy to complete a task. The View State
            will list all controls on the page that can be interacted with.

            Task:
            ${escapeConvoMessageContent(this.state.userPrompt)}

            # Call this function when the current task is complete
            > taskComplete() -> (
                _taskComplete()
            )

            # Call this function if there is an error or the task can not be completed
            > taskFailed(reason:string) -> (
                _taskFailed(reason)
            )

            # Call this function if you need additional information from the user to complete the
            # current step  of the current task.
            > getUserInput(
                # A short description of the input needed from the user
                description:string
            ) -> (
                return(_getUserInput(description))
            )

            # Executes an action in the current browser tab such as clicking on a button or entering
            # text into a text input. Follow the instruction property of the returned object.
            > executeAction(

                # The last actionStateId
                actionStateId:string

                # The type of action to execute
                actionType:enum("click" "enterText")

                # Id of an item in the current view state
                targetId:string

                # Text To enter into the specified input
                text?:string
            ) -> (
                return(_executeAction(__args actionStateId))
            )
        `);

        convo.defineLocalFunctions({
            _taskComplete:()=>{
                completed=true;
                console.log('hio 👋 👋 👋 TASK complete',);
                return 'ok'
            },
            _taskFailed:(reason)=>{
                failed=true;
                console.log('hio 👋 👋 👋 TASK failed',reason);
                return 'ok'
            },
            _getUserInput:(description)=>{
                console.log('hio 👋 👋 👋 getUserInput',description);
                return 'ok'
            },
            _executeAction:async (action)=>{
                console.log('hio 👋 👋 👋 execute action',action);
                const result=await this.parentCtrl.sendReceiveMessageWithDataAsync(
                    this.id,
                    'executeAction','executeActionResult',
                    action
                )
                console.log('hio 👋 👋 👋 execute result',result);
                return {
                    instruction:'Describe to the user the results of the action',
                    ...result
                };
            },
        });

        const maxSteps=3;
        let step=0;

        while(!completed && !failed && this.state.active){

            const {strategy,actionState}=await getStrategyAsync();

            if(!this.state.active){break;}

            await convo.completeAsync(/*convo*/`
                > define
                actionStateId="${actionState.id}"
                > user
                Based on the view state and strategy below call a function

                View State:
                ${escapeConvoMessageContent(actionStateToCsvMd(actionState))}

                Strategy:
                ${escapeConvoMessageContent(strategy)}

                actionStateId:${actionState.id}
            `);
            console.log('hio 👋 👋 👋 result',convo.convo);

            if(!this.state.active){break;}


            step++;
            if(step>=maxSteps){
                break;
            }
        }



    }
}

