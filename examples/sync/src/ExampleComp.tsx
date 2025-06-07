import { atDotCss } from "@iyio/at-dot-css";

export interface ExampleCompProps
{
    name:string;
    age?:number;
}

/**
 * @convoComponent
 */
export function ExampleComp({

}:ExampleCompProps){

    return (
        <div className={style.root()}>

            ExampleComp

        </div>
    )

}

const style=atDotCss({name:'ExampleComp',css:`
    @.root{
        display:flex;
        flex-direction:column;
    }
`});
