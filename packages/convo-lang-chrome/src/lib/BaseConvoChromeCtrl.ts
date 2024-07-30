import { ChromeMessage, ChromeMessageListener, addChromeMessageListener, removeChromeMessageListener, sendChromeMessage, sendReceiveChromeMessageAsync } from '@iyio/chrome-common';
import { DisposeContainer, ReadonlySubject, pushBehaviorSubjectAry, shortUuid } from "@iyio/common";
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { TaskCtrl } from './TaskCtrl';
import { CcMsg, CcMsgType, ConvoTaskState } from './convo-chrome-types';

export abstract class BaseConvoChromeCtrl
{

    private tabIds:number[]=[];
    private readonly _onTab=new Subject<number>();
    public get onTab():Observable<number>{return this._onTab}

    public addTab(id:number){
        if(this.tabIds.includes(id)){
            return;
        }
        this.tabIds.push(id);
        this._onTab.next(id);
    }

    private readonly _tasks:BehaviorSubject<TaskCtrl[]>=new BehaviorSubject<TaskCtrl[]>([]);
    public get tasksSubject():ReadonlySubject<TaskCtrl[]>{return this._tasks}
    public get tasks(){return this._tasks.value}

    private readonly _onMessageReceived=new Subject<CcMsg>();
    public get onMessageReceived():Observable<CcMsg>{return this._onMessageReceived}

    private readonly messageListener:ChromeMessageListener;
    public constructor()
    {

        this.messageListener={
            callbackEx:this._onMessage
        }
        addChromeMessageListener(this.messageListener);
    }

    protected readonly disposables=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.disposables.dispose();
        removeChromeMessageListener(this.messageListener);
    }

    private readonly _onMessage=(_msg:ChromeMessage,sender?:chrome.runtime.MessageSender):void=>{
        const msg=_msg as CcMsg;
        console.log('hio 👋 👋 👋 BaseConvoChromeCtrl msg',msg);
        if(msg.type==='updateState'){
            const match=this.tasks.find(t=>t.id===msg.taskId);
            if(match){
                console.log('hio 👋 👋 👋 update state',msg);
                match.state=msg.data;
                this._tasks.next([...this._tasks.value]);
            }
        }else if(msg.type==='returnAppState'){
            const newCtrls:TaskCtrl[]=[];
            for(const taskState of msg.data.tasks){
                const match=this.tasks.find(t=>t.id===taskState.id);
                if(match){
                    match.state=taskState;
                }else{
                    const ctrl=new TaskCtrl({task:taskState,parentCtrl:this});
                    newCtrls.push(ctrl);
                }
            }
            this._tasks.next([...this._tasks.value.filter(t=>msg.data.tasks.some(tt=>tt.id===t.id)),...newCtrls]);

        }
        this.onMessage(msg,sender);
        this._onMessageReceived.next(msg);
    }

    protected abstract onMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void;


    public startTask(prompt:string):void;
    public startTask(task:ConvoTaskState):void;
    public startTask(taskOrPrompt:string|ConvoTaskState):void{
        const msg:CcMsg=typeof taskOrPrompt==='string'?{
            taskId:shortUuid(),
            type:'startTask',
            data:taskOrPrompt,
        }:{
            taskId:taskOrPrompt.id,
            type:'startTaskEx',
            data:taskOrPrompt,
        }
        sendChromeMessage(msg);
    }

    protected addTask(task:ConvoTaskState):TaskCtrl;
    protected addTask(id:string,userPrompt:string):TaskCtrl;
    protected addTask(idOrTask:string|ConvoTaskState,userPrompt?:string):TaskCtrl{

        if(typeof idOrTask !== 'object'){
            if(!userPrompt){
                throw new Error('userPrompt required')
            }
            idOrTask={
                type:'convo',
                id: idOrTask,
                userPrompt,
                convo:'',
                active:true,
            }
        }

        if(this.hasTask(idOrTask.id)){
            throw new Error(`Task already exists with id ${idOrTask}`);
        }
        const ctrl=new TaskCtrl({task:idOrTask,parentCtrl:this})
        pushBehaviorSubjectAry(this._tasks,ctrl);
        this.runTaskAsync(ctrl);
        this.sendMessage({
            type:'returnAppState',
            data:{
                tasks:this.tasks.map(t=>t.state),
            },
        })
        return ctrl;
    }

    public hasTask(id:string){
        return this._tasks.value.some(t=>t.id===id);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected runTaskAsync(task:TaskCtrl):Promise<void>{
        return Promise.resolve();
    }

    public sendMessage(msg:CcMsg,responseTo?:CcMsg){
        if(responseTo){
            msg={
                resultId:responseTo.requestId,
                taskId:responseTo.taskId,
                ...msg
            }
        }
        sendChromeMessage(msg,this.tabIds);
    }

    public async sendReceiveMessageAsync<
        TSend extends CcMsgType,
        TReceive extends CcMsgType,
        TReceiveObj=Extract<CcMsg,{type:TReceive}>,
    >(
        taskId:string|null|undefined,
        sendType:Extract<CcMsg,{type:TSend}> extends {data:any}?never:TSend,
        receiveType:Extract<CcMsg,{type:TReceive}> extends {data:any}?TReceive:never,
    ):Promise<TReceiveObj extends {data:any}?TReceiveObj['data']:never>{

        const r=await sendReceiveChromeMessageAsync({
            taskId:taskId??undefined,
            type:sendType,
        },receiveType,this.tabIds);

        return r.data;
    }

    public async sendReceiveMessageWithDataAsync<
        TSend extends CcMsgType,
        TReceive extends CcMsgType,
        TSendObj=Extract<CcMsg,{type:TSend}>,
        TReceiveObj=Extract<CcMsg,{type:TReceive}>,
    >(
        taskId:string|null|undefined,
        sendType:Extract<CcMsg,{type:TSend}> extends {data:any}?TSend:never,
        receiveType:Extract<CcMsg,{type:TReceive}> extends {data:any}?TReceive:never,
        sendData:TSendObj extends {data:any}?TSendObj['data']:never
    ):Promise<TReceiveObj extends {data:any}?TReceiveObj['data']:never>{

        const r=await sendReceiveChromeMessageAsync({
            taskId:taskId??undefined,
            type:sendType,
            data:sendData
        },receiveType,this.tabIds);

        return r.data;
    }

    public onTaskStateChange(taskState:ConvoTaskState){
        this._tasks.next([...this._tasks.value]);
        this.sendMessage({
            type:'updateState',
            taskId:taskState.id,
            data:taskState,
        })
    }

    public async getDataAsync<T=any>(key:string):Promise<T|undefined>{

        if(!chrome.storage?.local){
            const promise=new Promise<T|undefined>(resolve=>{
                const sub=this.onMessageReceived.subscribe(msg=>{
                    if(msg.type==='returnData' && msg.key==key){
                        sub.unsubscribe();
                        resolve(msg.data);
                    }
                })
            })
            this.sendMessage({
                type:'getData',
                key
            })
            return await promise;
        }
        try{
            console.log('hio 👋 👋 👋 GET KEY',key);
            const r=await chrome.storage.local.get(msgDataKeyPrefix+key);
            console.log('hio 👋 👋 👋 chrome storage data',r);
            const v=r?.[msgDataKeyPrefix+key];
            // const json=globalThis.localStorage.getItem(msgDataKeyPrefix+key);
            // if(!json){
            //     return undefined;
            // }
            // const v=JSON.parse(json)
            return v;
        }catch(ex){
            console.error('Failed to get data for key',key,ex);
            return undefined;
        }
    }

    public async setDataAsync(key:string,value:any):Promise<void>{
        if(!chrome.storage?.local){
            this.sendMessage({
                type:'setData',
                key,
                data:value
            })
            return;
        }
        try{
            if(value===undefined){
                await chrome.storage.local.remove(msgDataKeyPrefix+key)
                //globalThis.localStorage?.removeItem(msgDataKeyPrefix+key);
            }else{
                await chrome.storage.local.set({[msgDataKeyPrefix+key]:value})
                //globalThis.localStorage?.setItem(msgDataKeyPrefix+key,JSON.stringify(value));
            }
        }catch(ex){
            console.error('Failed to set data for key',key,ex);
            // do nothing
        }
    }

}

const msgDataKeyPrefix='convo-service-data::'
