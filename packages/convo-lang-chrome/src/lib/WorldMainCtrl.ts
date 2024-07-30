import { shortUuid, simulateMouseClickAsync } from '@iyio/common';
import { BaseConvoChromeCtrl } from './BaseConvoChromeCtrl';
import { getActionItems } from './action-state-lib';
import { CcMsg, ConvoActionState, ExecuteAction, ExecuteActionResult } from './convo-chrome-types';

export class WorldMainCtrl extends BaseConvoChromeCtrl
{

    private actionStates:ConvoActionState[]=[];

    protected onMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void{
        console.log('hio 👋 👋 👋 main World Msg',msg,sender);
        switch(msg.type){

            case 'getActionState':{
                const items=getActionItems();
                const state:ConvoActionState={
                    id:shortUuid(),
                    created:Date.now(),
                    items,
                }
                this.actionStates.push(state);
                this.sendMessage({
                    type:'returnActionState',
                    data:{
                        ...state,
                        items:items.map(i=>{
                            const c={...i};
                            delete c.elem;
                            return c;
                        })
                    }
                },msg)
                break;
            }

            case 'executeAction':
                this.executeActionAsync(msg.data).then(v=>{
                    this.sendMessage({
                        type:'executeActionResult',
                        data:v,
                    },msg)
                });
                break;


        }
    }

    public async executeActionAsync(action:ExecuteAction):Promise<ExecuteActionResult>
    {

        const state=this.actionStates.find(a=>a.id===action.actionStateId);
        if(!state){
            return {
                success:false,
                errorMessage:'No action state found matching actionStateId'
            }
        }

        const target=state.items.find(t=>t.id===action.targetId);
        if(!target){
            return {
                success:false,
                errorMessage:'No action target found matching targetId'
            }
        }

        if(!target.elem){
            return {
                success:false,
                errorMessage:'Target no longer has reference to dom element'
            }
        }

        const bounds=target.elem.getBoundingClientRect();

        switch(action.actionType){

            case 'click':
                await simulateMouseClickAsync({
                    elem:target.elem,
                    clientX:bounds.x+bounds.width/2,
                    clientY:bounds.y+bounds.height/2,
                });
                break;

            case 'enterText':
                if(target.elem instanceof HTMLElement){
                    target.elem.focus();
                    target.elem.innerText=action.text??'';
                }
                (target.elem as any).value=action.text??'';
                break;

        }

        return {
            success:true
        }
    }

}
