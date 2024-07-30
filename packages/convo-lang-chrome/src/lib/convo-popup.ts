import { setChromeEnv } from '@iyio/chrome-common';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { popCtrl } from './PopupCtrl';
import { PopupView, PopupViewProps } from './PopupView';

export const initConvoChromePopup=(props?:PopupViewProps)=>{
    console.log('hio 👋 👋 👋 Im a popup',props);

    chrome.tabs.query({active:true,currentWindow:true}, t=>{
        console.log('hio 👋 👋 👋 popup tab',t);
        const tab=t[0];
        if(tab?.id){
            popCtrl().tabId=tab.id;
            popCtrl().sendMessage({
                type:'addTab',
                data:tab.id
            })
        }
    })

    setChromeEnv('popup');

    const root=document.querySelector('#__popup_root');
    if(!root){
        throw new Error('No element found with id __popup_root');
    }

    const reactRoot=createRoot(root);

    reactRoot.render(createElement(PopupView,props??null));
}
