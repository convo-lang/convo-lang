import { atDotCss } from "@iyio/at-dot-css";
import { UiActionItem } from "@iyio/common";
import { SlimButton, useSubject } from "@iyio/react-common";
import { popCtrl } from "./PopupCtrl";


export interface MainMenuViewProps
{
    items?:UiActionItem[];
}

export function MainMenuView({
    items
}:MainMenuViewProps){

    const views=useSubject(popCtrl().mainNavSubject);

    return (
        <div className={style.root()}>

            {(items??views).map((item,i)=>!item?null:(
                <SlimButton key={i} actionItem={item}>
                    {item.title}
                </SlimButton>
            ))}

        </div>
    )

}

const style=atDotCss({name:'MainMenuView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
    }
`});
