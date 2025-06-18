import { asType } from '@iyio/common';
import { ZodObject } from 'zod';
import { ConvoError } from './ConvoError';
import { ConvoExecutionContext, executeConvoFunction } from './ConvoExecutionContext';
import { escapeConvoMessageContent } from './convo-lib';
import { parseConvoCode } from './convo-parser';
import { ConvoErrorType, ConvoParsingResult } from './convo-types';

const varShouldBe=(convo:ConvoParsingResult,varName:string,value:string)=>{
    const statement=convo.result?.[1]?.fn?.body?.find(s=>s.set===varName);
    if(!statement){
        throw new Error(`No var found by name ${varName}`);
    }

    const eq=statement.value===value;
    if(!eq){
        console.error(`${varName} not equal to |${value}|`)
    }

    expect(statement.value).toBe(value);
}

const msgShouldBe=(convo:ConvoParsingResult,index:number,value:string|any[])=>{
    const msg=convo.result?.[index];
    if(!msg){
        throw new Error(`No message found at index ${index}`)
    }
    if(typeof value === 'string'){
        const content=msg.content;
        if(!content){
            throw new Error(`No message content found at index ${index}`);
        }

        const eq=content.trim()===value;
        if(!eq){
            console.error(`message ${index} content |${content.trim()}| should equal |${value}|`)
        }

        expect(content.trim()).toBe(value);
    }else{
        for(let i=0;i<value.length;i++){
            const v=value[i];
            let sv=msg.statement?.params?.[i]?.value;
            if(typeof sv === 'string'){
                sv=sv.trim();
            }
            if(v!==sv){
                console.error(`message index: ${index}, statement index:${i}, |${value}| !== |${sv}|`,JSON.stringify(msg,null,4))
            }
            expect(v).toBe(sv);

        }
    }
}

const defaultPrompt=/*convo*/`

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

    # Grades a paper
> gradePaper(

    # Score 1 to 10
    score: number

    # Email of user ) ->
    email?: string

    # The users job
    job: array(map(
        name: string
    ))

) -> (

    grade = __args

    lable1: beans.xy = 'good'
    lable?: beanx = dIt()
    lable3: bean3 = beans
    lable3: bean4 = beans.xy
    lable3: bean3 = 0.5

    map(
        name: 'jeff'
        age: 55
        items: map(
            jewels: 100
        )
    )

    saveGrade( grade )

    otherStuff(
        value: add( grade.email value2:"f" 'i\\'_bob' 77.65 .87 "I \\"links\\"" 88 )
    )

    moreStuff( undefined true false null )

    types( number string bool boolean time void )

    sendEmail(grade.email)

    gotoJob(grade.job)

    if( gt(grade.score 8) ) then (
        return('passed')
    ) elif ( lt(grade.score 3) ) then (
        return(map( score:0 message:"did not meat min grad"))
    ) else (
        log('we are moving on')
    )

    beans = 'good'

    list = array( beans 'corn' 3.14 )

    for( item in list ) do(
        log('me item is {{item}}')
    )

    getHeader(age:80)

    return('my name is slim')
)



# Returns a header system message
> local getHeader( age:number ) -> (
    return('James is a funky monkey {{age}} years old')
)

> dude
I'm okxc

> system
You are a friendly ghost. {{getHeader()}}

> user
My name is {{name}}


> call gradePaper(
    score: 1
    email: 'bob@tom.com'
    job:map( name: 'salad fingers' )
)


# end
`;


describe('convo',()=>{

    const parse=(msgCount:number|null,prompt:string,debug?:(...args:any[])=>void)=>{
        const r=parseConvoCode(prompt,{debug});

        expect(r.error).toBeUndefined();

        if(msgCount!==null){
            expect(r.result?.length).toBe(msgCount);
        }

        return r;
    }

    it('should parse',()=>{
        parse(8,defaultPrompt);
    })



    it('should generate function scheme',async ()=>{

        const convo=parse(1,/*convo*/`

            > schemeTestFn(
                numberProp: number
                stringProp: string
                booleanProp: boolean
                timeProp: time
                voidProp: void
                nullProp: null
                undefinedProp: undefined
                mapTProp: map
                arrayTProp: array
                anyProp: any
                intProp: int
                mapProp: map(
                    stringMapProp: string
                    numberMapProp: number
                )
                arrayProp: array( string )
                arrayMapProp: array( map(
                    stringArrayMapProp: string
                    numberArrayMapProp: number
                ))
                numberPropOptional?: number
                stringPropOptional?: string
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        const exe=new ConvoExecutionContext();
        const args=exe.getConvoFunctionArgsScheme(fn);

        expect(args).toBeInstanceOf(ZodObject);

        const params={
            numberProp:4.5,
            stringProp:'stuff',
            booleanProp:true,
            timeProp:Date.now(),
            voidProp:undefined,
            nullProp:null,
            undefinedProp:undefined,
            mapTProp:{},
            arrayTProp:[],
            anyProp:'foo',
            intProp:8,
            mapProp:{
                stringMapProp:'moreStuff',
                numberMapProp:77,
            },
            arrayProp:['str1','str2'],
            arrayMapProp:[{
                stringArrayMapProp:'evenMoreStuff',
                numberArrayMapProp:222,
            }],
            numberPropOptional:5 as number|undefined,
            stringPropOptional:'lastOfTheStuff' as string|undefined,
        }

        expect(args.safeParse(params).success).toBe(true);

        delete params.numberPropOptional;
        delete params.stringPropOptional;
        expect(args.safeParse(params).success).toBe(true);

        delete (params as any).numberProp;
        expect(args.safeParse(params).success).toBe(false);

        params.numberProp=7;
        expect(args.safeParse(params).success).toBe(true);

        delete (params.mapProp as any).stringMapProp;
        expect(args.safeParse(params).success).toBe(false);

        params.mapProp={
            stringMapProp:'tty',
            numberMapProp:44
        };
        expect(args.safeParse(params).success).toBe(true);

        (params.arrayMapProp as any[]).push(false);
        expect(args.safeParse(params).success).toBe(false);
    })




    it('should eval or statement',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                valueA: any
                valueB: any
                valueC: any
            ) -> (
                return( or(valueA valueB valueC) )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{valueA:1,valueB:0,valueC:'ok'})).toBe(1);
        expect(executeConvoFunction(fn,{valueA:0,valueB:false,valueC:'ok'})).toBe('ok');

    })




    it('should eval or statement with no args',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                return( or() )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toBeUndefined();

    })




    it('should add numbers',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                valueA: number
                valueB?: number
            ) -> (
                return( add(valueA valueB) )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{valueA:3,valueB:2})).toBe(5);

        expect(executeConvoFunction(fn,{valueA:90,valueB:9})).toBe(99);

    })




    it('should escape single quotes in strings',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                return( 'I\\'m bob' )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toBe("I'm bob");

    })





    it('should escape double quotes in strings',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                return( "in the famous word of colonel sanders \\"i'm too drunk to taste this chicken\\" " )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toBe("in the famous word of colonel sanders \"i'm too drunk to taste this chicken\" ");

    })





    it('should parse string with no statement',async ()=>{

        const convo=parse(1,/*convo*/`
            > user
            hi bob
        `);

        const msg=convo.result?.[0];

        expect(msg).not.toBeUndefined();
        if(!msg){
            return;
        }

        expect(msg.statement).toBeUndefined();
    })

    it('should embed strings',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                return( '1 + 1 = {{ add(1 1) }}' )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toBe("1 + 1 = 2");
    })

    it('should not embed double quote strings',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                return( "1 + 1 = {{ add(1 1) }}" )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toBe("1 + 1 = {{ add(1 1) }}");
    })





    it('should add compare negative numbers',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> (
                return( eq(value -2) )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:-2})).toBe(true);

        expect(executeConvoFunction(fn,{value:2})).toBe(false);

    })





    it('should allow commas and semi-colons',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> (
                return( eq( value , -2) );
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:-2})).toBe(true);

        expect(executeConvoFunction(fn,{value:2})).toBe(false);

    })





    it('should deep return',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: boolean
            ) -> (
                if(value) then(
                    if(value) then(
                        return('first')
                    )
                )
                return('last')
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:true})).toBe('first');

        expect(executeConvoFunction(fn,{value:false})).toBe('last');

    })





    it('should return based on if',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> (
                if(gt(value 5)) then (
                    return('more')
                )else(
                    return('less')
                )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:3})).toBe('less');

        expect(executeConvoFunction(fn,{value:8})).toBe('more');

    })





    it('should validate return type',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> string (
                if(gt(value 5)) then (
                    return('more')
                )else(
                    return(0)
                )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:8})).toBe('more');

        try{
            executeConvoFunction(fn,{value:3});
            throw new Error('Return validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-return-value-type'));
            }else{
                throw ex;
            }

        }

    })





    it('should validate function args',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> (
                return( value )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:8})).toBe(8);

        try{
            executeConvoFunction(fn,{value:'tree'});
            throw new Error('Arg validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-args'));
            }else{
                throw ex;
            }

        }

    })



    it('should coerce function args',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> (
                return( value )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:8})).toBe(8);

        executeConvoFunction(fn,{value:'3'});

    })





    it('should reference __args',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value: number
            ) -> (
                return( __args )
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:8})).toEqual({value:8});

    })





    it('should loop using while',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                total = 0
                n = 0
                while( lt(n 5) ) do (
                    total = add( n total )
                    n = add( n 1 )
                )
                return(total)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toEqual(10);

    })





    it('should loop using foreach',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                total = 0
                foreach( num=in(array(1 2 3)) ) do (
                    total = add( num total )
                )
                return(total)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toEqual(6);

    })




    it('should break foreach',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                total = 0
                foreach( num=in(array(1 2 3 4 )) ) do (
                    if(eq(num 4)) then(
                        break()
                    )
                    total = add( num total )
                )
                return(total)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toEqual(6);

    })




    it('should increment var',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                inc(total)
                inc(total 2)
                return(total)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toEqual(3);

    })




    it('should decrement var',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn() -> (
                dec(total)
                dec(total 2)
                return(total)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn)).toEqual(-3);

    })




    it('should validate enum with strings and numbers',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value:enum('a' 'b' 3)
            ) -> (
                return(add(value value))
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:'a'})).toEqual('aa');
        expect(executeConvoFunction(fn,{value:'b'})).toEqual('bb');
        expect(executeConvoFunction(fn,{value:3})).toEqual(6);

        try{
            executeConvoFunction(fn,{value:'c'});
            throw new Error('Arg validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-args'));
            }else{
                throw ex;
            }

        }

        try{
            executeConvoFunction(fn,{value:6});
            throw new Error('Arg validation should have throw an error')
        }catch(ex){
            if(ex instanceof ConvoError){
                expect(ex.convoType).toBe(asType<ConvoErrorType>('invalid-args'));
            }else{
                throw ex;
            }

        }
    })




    it('should use switch statement',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value:any
            ) -> (
                result = switch(
                    value
                    case(1) "one"
                    case(2) "two"
                )
                return(result)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:1})).toEqual('one');
        expect(executeConvoFunction(fn,{value:2})).toEqual('two');
        expect(executeConvoFunction(fn,{value:3})).toEqual(undefined);

    })




    it('should use switch statement with multiple switch values',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value:any
                value2:any
            ) -> (
                result = switch(

                    value
                    case(1) "one"
                    case(2) "two"

                    value2
                    case('b') "bee"
                    case('c') "sea"

                )
                return(result)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:1,value2:'c'})).toEqual('one');
        expect(executeConvoFunction(fn,{value:2,value2:'b'})).toEqual('two');
        expect(executeConvoFunction(fn,{value:3,value2:'c'})).toEqual('sea');
        expect(executeConvoFunction(fn,{value:4,value2:'b'})).toEqual('bee');
        expect(executeConvoFunction(fn,{value:5,value2:'z'})).toEqual(undefined);

    })




    it('should use switch statement with default',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value:any
            ) -> (
                result = switch(

                    value
                    case(1) "one"
                    case(2) "two"

                    default() "three"

                    test(true) "not possible"

                )
                return(result)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:1})).toEqual('one');
        expect(executeConvoFunction(fn,{value:2})).toEqual('two');
        expect(executeConvoFunction(fn,{value:3})).toEqual('three');
        expect(executeConvoFunction(fn,{value:77})).toEqual('three');

    })




    it('should use switch statement with test',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value:any
            ) -> (
                result = switch(

                    value
                    case(1) "one"
                    case(2) "two"

                    test(gt(value,10)) "more that 10"

                )
                return(result)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:1})).toEqual('one');
        expect(executeConvoFunction(fn,{value:2})).toEqual('two');
        expect(executeConvoFunction(fn,{value:3})).toEqual(undefined);
        expect(executeConvoFunction(fn,{value:77})).toEqual('more that 10');

    })




    it('should use switch statement as ternary',async ()=>{

        const convo=parse(1,/*convo*/`
            > testFn(
                value:any
            ) -> (
                result = switch( value "true" "false" )
                return(result)
            )
        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:0})).toEqual('false');
        expect(executeConvoFunction(fn,{value:false})).toEqual('false');
        expect(executeConvoFunction(fn,{value:1})).toEqual('true');
        expect(executeConvoFunction(fn,{value:true})).toEqual('true');

    })




    it('should parse message starting without !',async ()=>{

        const convo=parse(1,/*convo*/`
            > user
            [](https://example.com/image.jpg)
            Image above
        `);

        const msg=convo.result?.[0]?.content;
        expect(msg).not.toBeUndefined();

        expect(msg?.startsWith('[')).toBe(true);

    })

    it('should parse message starting with !',async ()=>{

        const convo=parse(1,/*convo*/`
            > user
            ![](https://example.com/image.jpg)
            Image above
        `);

        const msg=convo.result?.[0]?.content;
        expect(msg).not.toBeUndefined();

        expect(msg?.startsWith('!')).toBe(true);

    })


    it('should parse message test messages with tags',async ()=>{

        const convo=parse(4,/*convo*/`

            @tag1
            > user
            hi {{123}}

            @tag2
            > assistant
            Hello

            @tag3
            > user
            bye

            > assistant
            👋
        `);

        const messages=convo.result;

        expect(messages?.[0]?.tags?.[0]?.name).toBe('tag1');
        expect(messages?.[1]?.tags?.[0]?.name).toBe('tag2');
        expect(messages?.[2]?.tags?.[0]?.name).toBe('tag3');
        expect(messages?.[3]?.tags?.[0]?.name).toBeUndefined();

        expect(messages?.[0]?.statement?.params?.length).toBe(2);
        expect(messages?.[0]?.statement?.params?.[0]?.value?.trim?.()).toBe('hi');
        expect(messages?.[0]?.statement?.params?.[1]?.value).toBe(123);
        expect(messages?.[1]?.content).toBe('Hello');
        expect(messages?.[2]?.content).toBe('bye');
        expect(messages?.[3]?.content).toBe('👋');

    })


    it('should parse message test messages with comments',async ()=>{

        const convo=parse(4,/*convo*/`

            #comment1
            > user
            hi {{123}}

            #comment2
            > assistant
            Hello

            #comment3
            > user
            bye

            > assistant
            👋
        `);

        const messages=convo.result;

        expect(messages?.[0]?.description).toBe('comment1');
        expect(messages?.[1]?.description).toBe('comment2');
        expect(messages?.[2]?.description).toBe('comment3');
        expect(messages?.[3]?.description).toBeUndefined();

        expect(messages?.[0]?.statement?.params?.length).toBe(2);
        expect(messages?.[0]?.statement?.params?.[0]?.value?.trim?.()).toBe('hi');
        expect(messages?.[0]?.statement?.params?.[1]?.value).toBe(123);
        expect(messages?.[1]?.content).toBe('Hello');
        expect(messages?.[2]?.content).toBe('bye');
        expect(messages?.[3]?.content).toBe('👋');

    })


    it('should parse message test messages with comments and tags',async ()=>{

        const convo=parse(6,/*convo*/`

            #comment1

            @tag1
            > user
            hi {{123}}

            @tag2
            #comment2
            > assistant
            Hello

            @tag3

            #comment3
            > user
            bye

            #comment4
            > user
            bye-s
            #not a comment
            hi-s

            #comment5
            > user
            ok

            > assistant
            👋
        `);

        const messages=convo.result;

        expect(messages?.[0]?.tags?.[0]?.name).toBe('tag1');
        expect(messages?.[1]?.tags?.[0]?.name).toBe('tag2');
        expect(messages?.[2]?.tags?.[0]?.name).toBe('tag3');
        expect(messages?.[3]?.tags?.[0]?.name).toBeUndefined();

        expect(messages?.[0]?.description).toBe('comment1');
        expect(messages?.[1]?.description).toBe('comment2');
        expect(messages?.[2]?.description).toBe('comment3');
        expect(messages?.[3]?.description).toBe('comment4');
        expect(messages?.[5]?.description).toBeUndefined();

        expect(messages?.[0]?.statement?.params?.length).toBe(2);
        expect(messages?.[0]?.statement?.params?.[0]?.value?.trim?.()).toBe('hi');
        expect(messages?.[0]?.statement?.params?.[1]?.value).toBe(123);
        expect(messages?.[1]?.content).toBe('Hello');
        expect(messages?.[2]?.content).toBe('bye');
        expect(messages?.[3]?.content).toBe('bye-s\n#not a comment\nhi-s');
        expect(messages?.[5]?.content).toBe('👋');
        expect(messages?.[5]?.content).toBe('👋');

    });

    it('should escapeConvoMessageContent',()=>{
        expect(escapeConvoMessageContent('>')).toBe('\\>');
        expect(escapeConvoMessageContent('\\>')).toBe('\\\\>');
        expect(escapeConvoMessageContent('\\\\>')).toBe('\\\\\\>');
        expect(escapeConvoMessageContent('\\\\> >')).toBe('\\\\\\> >');
        expect(escapeConvoMessageContent('\\\\> \\>')).toBe('\\\\\\> \\>');

        expect(escapeConvoMessageContent('\n>')).toBe('\n\\>');
        expect(escapeConvoMessageContent('\n\\>')).toBe('\n\\\\>');
        expect(escapeConvoMessageContent('\n\\\\>')).toBe('\n\\\\\\>');

        expect(escapeConvoMessageContent('   >')).toBe('   \\>');
        expect(escapeConvoMessageContent('   \\>')).toBe('   \\\\>');
        expect(escapeConvoMessageContent('\n   \\\\>')).toBe('\n   \\\\\\>');

        expect(escapeConvoMessageContent('\n   >')).toBe('\n   \\>');
        expect(escapeConvoMessageContent('\n   \\>')).toBe('\n   \\\\>');
        expect(escapeConvoMessageContent('\n   \\\\>')).toBe('\n   \\\\\\>');
    });


    it('should parse escaped strings',async ()=>{

        const esc1='{{777}}';
        const esc2='>';
        const esc3='> >';
        const esc4='> \\>';
        const esc5='\\> \\>';
        const esc6='\\\\> \\>';

        const convo=parse(null,/*convo*/`

            > testFn(value:any) -> (
                return({
                    a:'\\{{value}}',
                    b:'\\\\{{value}}'
                })
            )

            > define
            var0="\\\\"
            var1='\\\\'
            var2='\\{{123}}'
            var3='\\''
            var4="\\""

            > user
            hi \\ \\{{jeff

            > user
            bye \\\\{{123}}
> user
{{456}}hi \\\\{{'abc'}}

            > user
            ${escapeConvoMessageContent(esc1)}

            > user
            \\>

            > user
            \\\\>

            > user
            \\\\\\>

            > user
            ${escapeConvoMessageContent(esc2)}

            > user
            \\> >

            > user
            \\\\> >

            > user
            \\\\\\> >

            > user
            \\> \\>

            > user
            \\\\> \\>

            > user
            \\\\\\> \\>

            > user
            ${escapeConvoMessageContent(esc3)}

            > user
            ${escapeConvoMessageContent(esc4)}

            > user
            ${escapeConvoMessageContent(esc5)}

            > user
            ${escapeConvoMessageContent(esc6)}

            > user
            big boy {{3000}} >

        `);

        const fn=convo.result?.[0]?.fn;

        expect(fn).not.toBeUndefined();
        if(!fn){
            return;
        }

        expect(executeConvoFunction(fn,{value:'abc'})).toEqual({
            a:'{{value}}',
            b:'\\abc'
        });

        varShouldBe(convo,'var0','\\');
        varShouldBe(convo,'var1','\\');
        varShouldBe(convo,'var2','{{123}}');
        varShouldBe(convo,'var3','\'');
        varShouldBe(convo,'var4','"');

        let n=2
        msgShouldBe(convo,n++,'hi \\ {{jeff');
        msgShouldBe(convo,n++,['bye \\',123]);
        msgShouldBe(convo,n++,['',456,'hi \\','abc']);
        msgShouldBe(convo,n++,esc1);
        msgShouldBe(convo,n++,'>');
        msgShouldBe(convo,n++,'\\>');
        msgShouldBe(convo,n++,'\\\\>');
        msgShouldBe(convo,n++,esc2);
        msgShouldBe(convo,n++,'> >');
        msgShouldBe(convo,n++,'\\> >');
        msgShouldBe(convo,n++,'\\\\> >');
        msgShouldBe(convo,n++,'> \\>');
        msgShouldBe(convo,n++,'\\> \\>');
        msgShouldBe(convo,n++,'\\\\> \\>');
        msgShouldBe(convo,n++,esc3);
        msgShouldBe(convo,n++,esc4);
        msgShouldBe(convo,n++,esc5);
        msgShouldBe(convo,n++,esc6);
        msgShouldBe(convo,n++,['big boy',3000,'>']);

    })


    it('should parse json message',async ()=>{

        const convo=parse(1,/*convo*/`

            @format json
            > user
            {
                "name":"alf",
                "age":103
            }

        `);

        expect(convo.result?.[0]?.jsonValue).toEqual({
            "name":"alf",
            "age":103
        })


    })


    it('should ignore next message comment',async ()=>{

        const convo=parse(3,/*convo*/`
            > user
            hi

            // comment1
            > user
            hey

            # comment2
            > user
            yo

        `);

        const msgs=convo.result??[];
        expect(msgs.length).toBe(3);

        expect(msgs[0]?.content).toBe('hi');
        expect(msgs[1]?.content).toBe('hey');

    })

});




