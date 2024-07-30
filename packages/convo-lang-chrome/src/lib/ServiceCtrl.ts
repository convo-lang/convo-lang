import { BaseConvoChromeCtrl } from './BaseConvoChromeCtrl';
import { TaskCtrl } from './TaskCtrl';
import { CcMsg, ConvoTaskState } from './convo-chrome-types';

export interface ServiceCtrlOptions
{
    init?:(ctrl:ServiceCtrl)=>void|Promise<void>;
}

export class ServiceCtrl extends BaseConvoChromeCtrl
{
    private inited=false;
    private initPromise?:Promise<void>
    private _init?:(ctrl:ServiceCtrl)=>void|Promise<void>;

    public constructor({
        init
    }:ServiceCtrlOptions){
        super();
        this._init=init;
    }

    private initAsync():Promise<void>{
        return this.initPromise??(this.initPromise=(async ()=>{
            await this._init?.(this);
        })())
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void{
        if(!this.inited){
            this.initAsync().then(()=>this.finishOnMessage(msg,sender))
        }else{
            this.finishOnMessage(msg,sender);
        }
    }
    private finishOnMessage(msg:CcMsg,sender?:chrome.runtime.MessageSender):void{
        console.log('hio 👋 👋 👋 service msg',msg);
        switch(msg.type){
            case 'startTask':
                if(!msg.taskId || (typeof msg.data !== 'string')){
                    throw new Error('startTask message requires taskId and data as a string')
                }
                this.addTask(msg.taskId,msg.data);
                break;

            case 'getAppState':
                this.sendMessage({
                    type:'returnAppState',
                    data:{
                        tasks:this.tasks.map(t=>t.state)
                    }
                },msg);
                break;

            case 'startTaskEx':
            case 'updateState':
                if(msg.type==='startTaskEx'){
                    this.addTask(msg.data);
                }
                if(msg.data.capture){
                    this.updateTaskState(msg,msg.data);
                }
                this.updateBadge();
                break;

            case 'setData':
                this.setDataAsync(msg.key,msg.data);
                break;

            case 'getData':
                this.getDataAsync(msg.key).then(data=>{
                    this.sendMessage({
                        type:'returnData',
                        data,
                        key:msg.key
                    },msg);
                });
                break;

            case 'addTab':
                this.addTab(msg.data);
                break;
        }
    }

    protected override async runTaskAsync(task:TaskCtrl):Promise<void>{

        if(task.state.type==='convo'){

            await task.executeAsync({
                getScreenShotAsync:()=>chrome.tabs.captureVisibleTab({})
            })
        }

    }

    private updateTaskState(msg:CcMsg,task:ConvoTaskState){
        console.log('hio 👋 👋 👋 start update task in service',msg);
        if(task.type==='capture'){
            if(!task.capture?.tabStreamId){
                chrome.tabCapture.getMediaStreamId({
                    targetTabId:task.capture?.tabId,
                },r=>{
                    if(task.capture && !task.capture.tabStreamId){
                        task.capture.tabStreamId=r;
                        this.onTaskStateChange(task);
                    }
                });
            }
        }
    }

    private updateBadge()
    {
        const count=this.tasks.filter(t=>t.state.type==='capture' && !t.state.capture?.stop).length;
        chrome.action.setBadgeText({
            text:count?count.toString():''
        })
    }
}


