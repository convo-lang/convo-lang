import { asType, valueIsZodObject } from '@iyio/common';
import { ZodEnum, ZodObject, z } from 'zod';
import { CallbackConvoCompletionService } from './CallbackConvoCompletionService';
import { Conversation } from "./Conversation";
import { ConvoError } from './ConvoError';
import { ConvoComponent } from './convo-component-types';
import { getConvoMetadata } from './convo-lib';
import { ConvoComponentMode, ConvoErrorType, ConvoThreadFilter, FlatConvoConversation } from "./convo-types";

describe('conversation',()=>{

    it('should complete',async ()=>{

        let _flat:FlatConvoConversation|null=null;
        const responseText='Turn left';

        const cs=new CallbackConvoCompletionService(async f=>{
            _flat=f;
            return [{
                role:'assistant',
                content:responseText
            }];
        })

        const convo=new Conversation({completionService:cs});

        const r=await convo.completeAsync(/*convo*/`
            > system
            You are a friendly NASCAR driver.

            > user
            What do I do after going fast?
        `);

        const flat=_flat as FlatConvoConversation|null;

        expect(flat).not.toBeNull();
        expect(flat?.messages.length).toBe(2);

        expect(flat?.messages[1]?.content).toBe('What do I do after going fast?')
        expect(r.message?.content).toBe(responseText);

    })

    it('should call function',async ()=>{

        const speed=150;

        let callFn='goFast';
        let callParams:any={speed};

        const cs=new CallbackConvoCompletionService(async ()=>{
            return [{
                callFn,
                callParams
            }];
        })

        const convo=new Conversation({completionService:cs});
        let printed=false;
        convo.print=()=>{
            printed=true;
        }

        let r=await convo.completeAsync(/*convo*/`
            > goFast(
                speed: number
            ) -> (
                print('SET_SPEED' speed )
                @shared
                currentSpeed=speed
            )

            > goFaster() -> (
                @shared
                newSpeed=add(currentSpeed 100)
            )

            > user
            I want to go really fast
        `);

        expect(r.exe?.sharedVars?.['currentSpeed']).toBe(speed);

        expect(printed).toBe(true);

        callFn='goFaster';
        callParams=undefined;
        r=await convo.completeAsync(/*convo*/`
            > user
            Go even faster
        `)

        expect(r.exe?.sharedVars?.['newSpeed']).toBe(speed+100);

    })

    it('should eval top level statements',async ()=>{

        const cs=new CallbackConvoCompletionService(async ()=>{
            return [{
                role:'assistant',
                content:'Bobby',
            }]
        })

        const convo=new Conversation({completionService:cs});

        const r=await convo.completeAsync(/*convo*/`
            > do
            Ricky='Bobby'

            > user
            What is Rick's last name?
        `);

        expect(r.exe?.sharedVars?.['Ricky']).toBe('Bobby');

    })

    it('should validate user defined return type',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`
            > do
            Stats=map(
                speed: number
                turn: string
            )

            > goFast(correct:boolean) -> Stats (
                if( correct ) then (
                    return( map(
                        speed: 150
                        turn: 'left'
                    ) )
                ) else (
                    return( map( color: 'red' ))
                )
            )
        `);

        const r=await convo.callFunctionAsync('goFast',{correct:true});


        expect(r?.speed).toBe(150);
        expect(r?.turn).toBe('left');

        try{
            await convo.callFunctionAsync('goFast',{correct:false});
            throw new Error('Return validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-return-value-type'));
            }else{
                throw ex;
            }

        }

    })

    it('should validate user defined args type',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`
            > do
            Stats=map(
                speed: number
                turn: string
            )

            > goFast(speed) Stats -> (
                return( speed )
            )
        `);

        const r=await convo.callFunctionAsync('goFast',{
            speed:200,
            turn:'left',
        });


        expect(r).toBe(200);

        try{
            await convo.callFunctionAsync('goFast',{slow:true});
            throw new Error('Arg validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-args'));
            }else{
                throw ex;
            }

        }

    })

    it('should validate enum',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`
            > define
            Category = enum('fun' 'boring')

            Grade = map(
                score: number
                suggestions?: array(string)
                category: Category
            )

            > processGrade(
                score
                suggestions
                category
            ) Grade -> number (
                if( eq(category 'fun') ) then (
                    return(mul(score 2))
                ) else (
                    return(div(score 2))
                )
            )

        `);

        let r=await convo.callFunctionAsync('processGrade',{
            score:10,
            turn:'left',
            category:'fun'
        });
        expect(r).toBe(20);

        r=await convo.callFunctionAsync('processGrade',{
            score:10,
            turn:'left',
            category:'boring'
        });
        expect(r).toBe(5);

        try{
            await convo.callFunctionAsync('processGrade',{
                score:10,
                turn:'left',
                category:'cats'
            });
            throw new Error('Arg validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-args'));
            }else{
                throw ex;
            }

        }

    })

    it('should check type with is operator',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`
            > define
            Category = enum('fun' 'boring')

            Grade = map(
                score: number
                suggestions?: array(string)
                category: Category
            )

            > checkType(
                value: any
            ) -> (
                return(map(
                    isCategory:is(value Category)
                    isGrade:is(value Grade)
                    isNumber:is(value number)
                    isString:is(value string)
                ))
            )

        `);

        let r=await convo.callFunctionAsync('checkType',{value:6});
        expect(r).toEqual({
            isCategory:false,
            isGrade:false,
            isNumber:true,
            isString:false,
        })

        r=await convo.callFunctionAsync('checkType',{value:'6'});
        expect(r).toEqual({
            isCategory:false,
            isGrade:false,
            isNumber:false,
            isString:true,
        })

        r=await convo.callFunctionAsync('checkType',{value:'fun'});
        expect(r).toEqual({
            isCategory:true,
            isGrade:false,
            isNumber:false,
            isString:true,
        })

        r=await convo.callFunctionAsync('checkType',{value:{
            score:7,
            suggestions:['stay out of jail','don\'t trust a fart'],
            category:'fun'
        }});
        expect(r).toEqual({
            isCategory:false,
            isGrade:true,
            isNumber:false,
            isString:false,
        })

    })




    it('should create metadata',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`
            > define

            # description 0
            Category = enum('fun' 'boring')

            # description 1
            Grade = struct(
                # description 2
                score: number
                # description 3
                suggestions?: array(string)
                # description 4
                category: Category
            )

            # description 5
            > checkType(
                score
                suggestions
                category
            ) Grade -> (
                return(score)
            )

        `);

        const c=await convo.completeAsync();

        const category=c.exe?.sharedVars['Category'];
        const grade=c.exe?.sharedVars['Grade'];

        expect(category).not.toBeUndefined();
        expect(grade).not.toBeUndefined();


        let m=0;

        let metadata=getConvoMetadata(category);
        expect(metadata?.comment).toBe(`description ${m++}`);

        metadata=getConvoMetadata(grade);
        expect(metadata?.comment).toBe(`description ${m++}`);
        expect(metadata?.properties?.['score']?.comment).toBe(`description ${m++}`);
        expect(metadata?.properties?.['suggestions']?.comment).toBe(`description ${m++}`);
        expect(metadata?.properties?.['category']?.comment).toBe(`description ${m++}`);


        m=0;
        let zod=c.exe?.getVarAsType('Category');
        expect(zod).toBeInstanceOf(ZodEnum);
        expect(zod?.description).toBe(`description ${m++}`);


        zod=c.exe?.getVarAsType('Grade');
        expect(zod).toBeInstanceOf(ZodObject);
        expect(zod?.description).toBe(`description ${m++}`);
        if(valueIsZodObject(zod)){
            expect(zod.shape['score']?.description).toBe(`description ${m++}`);
            expect(zod.shape['suggestions']?.description).toBe(`description ${m++}`);
            expect(zod.shape['category']?.description).toBe(`description ${m++}`);
        }else{
            throw new Error('value Should be instance of ZodObject');
        }
    })

    it('should sleep',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            > testFn(delay:number)->(
                sleep(delay)
                return(delay)
            )

        `);

        const v=await convo.callFunctionAsync('testFn',{delay:1});
        expect(v).toBe(1);
    })

    it('should return promise',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            > testFn(delay:number)->(
                return(sleep(delay))
            )

        `);

        const v=await convo.callFunctionAsync('testFn',{delay:1});
        expect(typeof v).toBe('number');
    })




    it('should pipe',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            > pipeMessage() -> (
                convo << ---- #ok bill
                    > user
                    STUFF ok
                ----

                return('ok')
            )

        `);

        const r=await convo.callFunctionAsync('pipeMessage');

        expect(r).toBe('ok');

        expect(convo.convo).toContain('STUFF');

        expect(convo.convo.split('STUFF').length).toBe(3);

    })

    it('should pipe with map',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            > pipeMessage(
                a: string
                b: string
            ) -> (
                convo << map(
                    REPLACE:add(a '_' b)
                    MESSAGE:fn(
                        return(add(b '_' a))
                    )
                ) << ----
                    > user
                    REPLACE ok MESSAGE ko
                ----

                return('ok')
            )

        `);

        const r=await convo.callFunctionAsync('pipeMessage',{a:'GO',b:'FAST'});

        expect(r).toBe('ok');

        expect(convo.convo).toContain('GO_FAST');

        expect(convo.convo).toContain('FAST_GO');

        expect(convo.convo.split('GO_FAST').length).toBe(2);

        expect(convo.convo.split('FAST_GO').length).toBe(2);

    })

    it('should call extern defined function',async ()=>{

        const convo=new Conversation();

        let lastParams:any=undefined;
        let called=false;
        convo.defineFunction({
            name:'testFn',
            description:'Calls test function',
            local:true,
            paramsType:z.object({
                speed:z.number(),
                turn:z.string(),
            }),
            callback:(params)=>{
                called=true;
                lastParams=params;
                return `speed:${params.speed},turn:${params.turn}`
            }
        })

        const r=await convo.callFunctionAsync('testFn',{speed:150,turn:'left'});

        expect(called).toBe(true);
        expect(lastParams).not.toBeUndefined();
        expect(r).toBe(`speed:150,turn:left`);
        expect(lastParams.speed).toBe(150);
        expect(lastParams.speed).not.toBe('150');
        expect(lastParams.turn).toBe('left');
    })

    it('should enforce def overrides',async ()=>{

        const convo=new Conversation();

        expect(convo.defineType({name:'Type1',type:z.object({name:z.string()})})).not.toBeUndefined();
        expect(convo.getAssignment('Type1')).not.toBeUndefined();
        expect(convo.defineType({name:'Type1',type:z.object({type:z.string()})})).toBeUndefined();

        expect(convo.defineVar({name:'var1',value:77})).not.toBeUndefined();
        expect(convo.getAssignment('var1')).not.toBeUndefined();
        expect(convo.defineVar({name:'var1',value:66})).toBeUndefined();

        expect(convo.defineFunction({name:'fn1',paramsType:z.object({age:z.number().int()})})).not.toBeUndefined();
        expect(convo.getAssignment('fn1')).not.toBeUndefined();
        expect(convo.defineFunction({name:'fn1',paramsType:z.object({name:z.string().optional()})})).toBeUndefined();

    })



    it('should complete multiple suspensions',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            > testFn(delay:number)->(
                sleep(delay)
                sleep(delay)
                do(sleep(delay))
                do(do(do(do(sleep(delay)))))
                return(sleep(delay))
            )

        `);

        const v=await convo.callFunctionAsync('testFn',{delay:1});
        expect(typeof v).toBe('number');
    })



    it('should assign message content',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            @assignTo var1
            > user
            abc

            @assignTo var2
            @format json
            > user
            {
                name:"Ricky",
                age:39
            }

        `);

        await convo.flattenAsync();
        expect(convo.getVar('var1')).toBe('abc');
        expect(convo.getVar('var2')).toEqual({
            name:"Ricky",
            age:39
        });
    })



    it('Should parse JSON with single curly bracket',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            > define
            jsonValue={user:"jef"}

            > testFn()->(
                return(jsonValue)
            )

        `);

        const v=await convo.callFunctionAsync('testFn');
        expect(v).toEqual({user:"jef"});
    })



    // it('Should parse JSON with back-to-back curly brackets',async ()=>{

    //     const convo=new Conversation();

    //     convo.append(/*convo*/`

    //         > define
    //         jsonValue={user:{name:'Jeff',age:44}}

    //         > testFn()->(
    //             return(jsonValue)
    //         )

    //     `);

    //     const v=await convo.callFunctionAsync('testFn');
    //     expect(v).toEqual({user:{name:'Jeff',age:44}});
    // })



    it('Should use RAG',async ()=>{

        let ragParams:any;

        const convo=new Conversation({
            ragCallback:({params})=>{
                ragParams=params;
                return {
                    content:'Polar bears like coke ;)',
                    sourceId:'ice123',
                    sourceName:'Bears on Ice',
                    sourceUrl:'https://example.com/polarbears'
                }
            },
            completionService:new CallbackConvoCompletionService(async ()=>{
                return [{
                    role:'assistant',
                    content:'They don\'t anymore because we are melting all the ice',
                }]
            })
        });

        convo.append(/*convo*/`

            > define
            __rag=true
            __ragParams={go:'fast'}

            > user
            How do polar bears eat

        `);

        await convo.completeAsync();
        expect(convo.messages.length).toBe(4);
        expect(convo.messages[2]).toEqual({
            "role": "rag",
            "content": "Polar bears like coke ;)",
            "tags": [
                {
                    "name": "sourceId",
                    "value": "ice123"
                },
                {
                    "name": "sourceName",
                    "value": "Bears on Ice"
                },
                {
                    "name": "sourceUrl",
                    "value": "https://example.com/polarbears"
                }
            ],
            "sourceId": "ice123",
            "sourceName": "Bears on Ice",
            "sourceUrl": "https://example.com/polarbears"
        })
        expect(ragParams).toEqual({go:'fast'})
    })


    it('Should use RAG with prefix and suffix',async ()=>{

        const convo=new Conversation({
            ragCallback:()=>({
                content:'Polar bears like coke ;)',
                sourceId:'ice123',
                sourceName:'Bears on Ice',
                sourceUrl:'https://example.com/polarbears'
            }),
            completionService:new CallbackConvoCompletionService(async ()=>{
                return [{
                    role:'assistant',
                    content:'They don\'t anymore because we are melting all the ice',
                }]
            })
        });

        convo.append(/*convo*/`

            > define
            __rag=true

            > ragPrefix
            Use the content below to assist

            > ragSuffix
            The content above should be helpful

            > user
            How do polar bears eat

        `);

        const flat=await convo.flattenAsync();
        expect(flat.ragPrefix).toBe('Use the content below to assist');
        expect(flat.ragSuffix).toBe('The content above should be helpful');
        expect(flat.messages.length).toBe(2);
    })


    it('Should use threads',async ()=>{

        const convo=new Conversation();

        convo.append(/*convo*/`

            @thread A
            > define
            isThreadA=true

            @thread B
            > define
            isThreadB=true

            > define
            isDefaultThread=true

            > user
            This message is in both threads

            @thread A
            > user
            This message is in thread A

            @thread B
            > user
            This message is in thread B

        `);

        const testFilterAsync=async (
            threadFilter:ConvoThreadFilter,
            vars:Record<string,any>,
            messages:string[])=>
        {

            const flat=await convo.flattenAsync(undefined,{threadFilter});

            for(const e in vars){
                expect(flat.exe.getVar(e)).toBe(vars[e]);
            }

            expect(flat.messages.filter(m=>m.content).map(u=>u.content?.trim())).toEqual(messages);
        }


        await testFilterAsync(
            {includeThreads:['A']},
            {isThreadA:true,isThreadB:undefined,isDefaultThread:undefined},
            [
                'This message is in thread A'
            ]
        )

        await testFilterAsync(
            {includeThreads:['B']},
            {isThreadA:undefined,isThreadB:true,isDefaultThread:undefined},
            [
                'This message is in thread B'
            ]
        )

        await testFilterAsync(
            {includeThreads:['A'],includeNonThreaded:true},
            {isThreadA:true,isThreadB:undefined,isDefaultThread:true},
            [
                'This message is in both threads',
                'This message is in thread A'
            ]
        )

        await testFilterAsync(
            {includeThreads:['B'],includeNonThreaded:true},
            {isThreadA:undefined,isThreadB:true,isDefaultThread:true},
            [
                'This message is in both threads',
                'This message is in thread B'
            ]
        )
    })


    it('Should import',async ()=>{
        let handlerCallCount=0;
        const convo=new Conversation({
            disableAutoFlatten:true,
            importHandler:(r)=>{
                handlerCallCount++;
                switch(r.name){

                    case 'vars':
                        return {
                            name:r.name,
                            convo:/*convo*/`
                                > define
                                speed='fast'
                                toSub='do it'

                                @import sub
                                > user
                                Imported content {{subVar}}
                            `
                        }

                    case 'sub':
                        return {
                            name:r.name,
                            convo:/*convo*/`
                                > user
                                Sub msg - {{toSub}}

                                > define
                                subVar='Zero'
                            `
                        }

                    case 'types':
                        return {
                            name:r.name,
                            type:{
                                name:'User',
                                type:z.object({
                                    name:z.string(),
                                    age:z.number(),
                                })
                            }
                        }
                }
                return null;
            }
        });

        convo.append(/*convo*/`
            > user
            First line

            @import vars
            @import types
            > user
            go {{speed}}
        `);

        expect(handlerCallCount).toBe(0);

        let flat=await convo.flattenAsync();

        expect(handlerCallCount).toBe(3);
        expect(flat.messages.filter(m=>m.content).map(m=>m.content?.trim())).toEqual([
            'First line',
            'Sub msg - do it',
            'Imported content Zero',
            'go fast',
        ]);

        convo.append(/*convo*/`
            > user
            new msg {{subVar}}
        `)
        flat=await convo.flattenAsync();

        expect(handlerCallCount).toBe(3);
        expect(flat.messages.filter(m=>m.content).map(m=>m.content?.trim())).toEqual([
            'First line',
            'Sub msg - do it',
            'Imported content Zero',
            'go fast',
            'new msg Zero'
        ]);

        const userType=flat.exe.getVarAsType('User');
        expect(userType).not.toBeUndefined();
        expect(userType?.safeParse({name:'Ricky',age:40}).success).toBe(true);
        expect(userType?.safeParse({name:'Ricky',age:'40'}).success).toBe(false);
    });


    it('Should concat',async ()=>{

        const getMsgAsync=async (content:string)=>{
            const convo=new Conversation({
                disableAutoFlatten:true,
            });
            convo.append(content);
            const flat=await convo.flattenAsync();
            return flat.messages.filter(m=>m.content).map(m=>m.content??'');
        }

        let msgs=await getMsgAsync(/*convo*/`
            > user
            msg 1

            @concat
            > user
            msg 2
        `);
        expect(msgs.length).toBe(1);
        expect(msgs[0]?.includes('msg 1')).toBe(true);
        expect(msgs[0]?.includes('msg 2')).toBe(true);

        msgs=await getMsgAsync(/*convo*/`
            > user
            msg 1

            @concat
            > user
            msg 2

            @concat
            > user
            msg 3
        `);
        expect(msgs.length).toBe(1);
        expect(msgs[0]?.includes('msg 1')).toBe(true);
        expect(msgs[0]?.includes('msg 2')).toBe(true);
        expect(msgs[0]?.includes('msg 3')).toBe(true);

        msgs=await getMsgAsync(/*convo*/`
            > user
            msg 1

            > user
            msg 2

            @concat
            > user
            msg 3
        `);
        expect(msgs.length).toBe(2);
        expect(msgs[0]?.includes('msg 1')).toBe(true);
        expect(msgs[1]?.includes('msg 2')).toBe(true);
        expect(msgs[1]?.includes('msg 3')).toBe(true);

        msgs=await getMsgAsync(/*convo*/`
            > define
            value=true

            > user
            msg 1

            @concat
            @condition value
            > user
            msg 2
        `);
        expect(msgs.length).toBe(1);
        expect(msgs[0]?.includes('msg 1')).toBe(true);
        expect(msgs[0]?.includes('msg 2')).toBe(true);

        msgs=await getMsgAsync(/*convo*/`
            > define
            value=false

            > user
            msg 1

            @concat
            @condition value
            > user
            msg 2
        `);
        expect(msgs.length).toBe(1);
        expect(msgs[0]?.includes('msg 1')).toBe(true);
        expect(msgs[0]?.includes('msg 2')).toBe(false);

        msgs=await getMsgAsync(/*convo*/`
            > define
            a=false
            b=true

            > user
            msg 1

            @concat
            @condition a
            > user
            msg 2

            @concat
            @condition b
            > user
            msg 3
        `);
        expect(msgs.length).toBe(1);
        expect(msgs[0]?.includes('msg 1')).toBe(true);
        expect(msgs[0]?.includes('msg 2')).toBe(false);
        expect(msgs[0]?.includes('msg 3')).toBe(true);

    });


    it('Should create component using code block',async ()=>{
        const test=async (blockType:string,mode:ConvoComponentMode|null)=>{
            let comp:ConvoComponent|undefined;
            const convo=new Conversation({
                disableAutoFlatten:true,
                componentCompletionCallback:({component,submit})=>{
                    comp=component;
                    submit({
                        messages:[
                            {
                                role:'user',
                                content:'a-ok'
                            }
                        ]
                    })
                }
            });

            convo.append(/*convo*/`
                > user
                ${'```'}${blockType}
                <Example name="Jeff" age="{21}" />
                ${'```'}
            `);

            const flat=await convo.flattenAsync();
            expect(flat.messages.length).toBe(1);

            expect(flat.messages[0]?.component).toBe(mode??undefined);


            await convo.completeAsync();

            if(mode==='input'){
                expect(comp).not.toBeUndefined();
                expect(comp?.name).toBe('Example');
                expect(comp?.atts).toEqual({
                    name:'Jeff',
                    age:21
                });
            }else{
                expect(comp).toBeUndefined();
            }
        }

        await test(' input','input');

        await test(' xml input','input');

        await test(' mdx input','input');

        await test(' render','render');

        await test(' xml render','render');

        await test(' xml',null);

        await test('',null);


    });


    it('Should create component using code block',async ()=>{

        const convo=new Conversation({
            disableAutoFlatten:true,
            allowEvalCode:true
        });

        convo.append(/*convo*/`
            @eval
            > user
            ${'```'} js
            result=77
            ${'```'}
        `);

        const flat=await convo.flattenAsync();
        expect(flat.messages.length).toBe(1);

        expect(flat.messages[0]?.eval).toBe(true);


        await convo.completeAsync();

        await convo.flattenAsync();



    });

});
