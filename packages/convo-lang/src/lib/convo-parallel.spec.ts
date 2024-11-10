import { delayAsync } from "@iyio/common";
import { CallbackConvoCompletionService } from "./CallbackConvoCompletionService";
import { Conversation } from "./Conversation";
import { ConvoCompletionMessage } from "./convo-types";

describe('convo-parallel',()=>{

    it('should run prompts in parallel',async ()=>{

        const msgCount=4;
        let runCount=0;
        let returnResponseCount=0;

        const convo=new Conversation({
            completionService:new CallbackConvoCompletionService(async flat=>{

                const last=flat.messages[flat.messages.length-1];
                if(!last){
                    return []
                }

                if(last.role==='function' && last.calledParams){
                    returnResponseCount++;
                    return [{
                        role:'assistant',
                        content:`${last.calledParams['a']} plus ${last.calledParams['b']} equals ${last.calledReturn}`
                    }]
                }

                const content=last.content?.trim();
                if(!content){
                    return [];
                }

                const add=/add (\d+) plus (\d+)/i.exec(content);
                let result:ConvoCompletionMessage[];
                if(add){
                    result=[{
                        role:'assistant',
                        callFn:'addNumbers',
                        callParams:{a:Number(add[1]),b:Number(add[2])}
                    }]
                }else{
                    const parts=content.split(' ');
                    const end=parts[parts.length-1]??'';
                    result=[
                        {role:'assistant',content:end+' are funny'}
                    ]
                }

                runCount++;
                while(runCount<msgCount){
                    await delayAsync(1);
                }

                return result;
            })
        });

        convo.append(/*convo*/`

> addNumbers(a:number b:number) -> (add(a b))


@parallel
@call
> user
Add 1 plus {{'3'}}

@parallel
> user
Tell me a joke about cats

@parallel
> user
Tell me a joke about birds

@parallel
@call
> user
Add 55 plus {{'45'}}

        `);

        await convo.completeAsync();

        expect(runCount).toBe(msgCount);
        expect(returnResponseCount).toBe(2);

        let msgI=0;

        let msg=convo.messages[msgI++];
        expect(msg?.fn?.name).toBe('addNumbers');

        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('user');
        msg=convo.messages[msgI++];
        expect(msg?.fn?.call).toBe(true);
        expect(msg?.fn?.name).toBe('addNumbers');
        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('result');
        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('assistant');
        expect(msg?.content).toBe('1 plus 3 equals 4');

        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('user');
        expect(msg?.content).toBe('Tell me a joke about cats');
        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('assistant');
        expect(msg?.content).toBe('cats are funny');

        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('user');
        expect(msg?.content).toBe('Tell me a joke about birds');
        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('assistant');
        expect(msg?.content).toBe('birds are funny');

        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('user');
        msg=convo.messages[msgI++];
        expect(msg?.fn?.call).toBe(true);
        expect(msg?.fn?.name).toBe('addNumbers');
        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('result');
        msg=convo.messages[msgI++];
        expect(msg?.role).toBe('assistant');
        expect(msg?.content).toBe('55 plus 45 equals 100');


    })
})
