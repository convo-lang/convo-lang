import { setChromeEnv } from "@iyio/chrome-common";
import { ServiceCtrl } from "./ServiceCtrl";

export const initConvoChromeService=()=>{

    setChromeEnv('service');

    const service=new ServiceCtrl({});
    service.onTab.subscribe(async tabId=>{
        //service.addTab(tab.id);

        await chrome.scripting.executeScript({
            target:{tabId},
            files:['src/entry-points/world-iso.js']
        });

        await chrome.scripting.executeScript({
            target:{tabId},
            files:['src/entry-points/world-main.js'],
            world:'MAIN'
        });

        const existingContexts=await chrome.runtime.getContexts({});
        const offscreenDocument=existingContexts.find(c=> c.contextType==='OFFSCREEN_DOCUMENT');
        if(!offscreenDocument){
            await chrome.offscreen.createDocument({
                url: '/offscreen.html',
                reasons: [chrome.offscreen.Reason.USER_MEDIA],
                justification: 'Recording from chrome.tabCapture API',
            });
        }
    })

    // chrome.action.onClicked.addListener(async tab=>{
    //     console.log('tab clicked',tab);

    //     // await chrome.action.setPopup({
    //     //     tabId:tab.id,
    //     //     popup:'popup.html'
    //     // })

    //     if(tab.id!==undefined){



    //     }
    // });


}
