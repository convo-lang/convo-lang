import { Conversation, convo } from "@convo-lang/convo-lang";
import { z } from "zod";

const addNumbers=(a:number,b:number)=>{
    return a+b;
}
const multiplyNumbers=(a:number,b:number)=>{
    return a*b;
}

export const chainExample=async (
    a:number,
    b:number
)=>{

    const cv=new Conversation();

    const add=await cv.completeAsync(convo`
        > addNumbers(a:number b:number) -> ${addNumbers}

        > user
        Add ${a} plus ${b}
    `)

    const mul=await cv.completeAsync(convo`
        > addNumbers(a:number b:number) -> ${addNumbers}

        > multiplyNumbers(a:number b:number) -> (
            return(${multiplyNumbers}_(a b))
        )

        > user
        Multiply ${a} times ${b}
    `)

    const person=await cv.completeAsync(convo`
        > define
        Person=${z.object({name:z.string()})}

        @json Person
        > user
        Return Bob as a person
    `)

    console.log('Result convo',cv.convo)

    return {add,mul,person}


}

export const addExample=async (
    a:number,
    b:number
)=>{

    return await convo`

        > addNumbers(a:number b:number) -> ${addNumbers}

        > user
        Add ${a} plus ${b}
    `.debug();
}

export const multiplyExample=async (
    a:number,
    b:number
)=>{

    return await convo`

        > addNumbers(a:number b:number) -> ${addNumbers}

        > multiplyNumbers(a:number b:number) -> (
            return(${multiplyNumbers}_(a b))
        )

        > user
        Multiply ${a} times ${b}
    `.debug();
}