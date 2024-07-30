import { UiActionItem } from "@iyio/common";
import { CaptureView } from "./CaptureView";
import { popCtrl } from "./PopupCtrl";
import { TaskView } from "./TaskView";
import { CcView } from "./convo-chrome-types";

export const defaultCcNavItems:UiActionItem[]=[
    // {
    //     title:'Vision Task',
    //     action:()=>popCtrl().route='/task',
    // },
    {
        title:'Record',
        action:()=>popCtrl().route='/capture',
    },
]

export const defaultCcPopupViews:CcView[]=[
    {
        route:'/',
        render:()=><CaptureView/>//<MainMenuView/>,
    },
    {
        route:'/task',
        render:()=><TaskView/>,
    },
    {
        route:'/capture',
        render:()=><CaptureView/>,
    },
]
