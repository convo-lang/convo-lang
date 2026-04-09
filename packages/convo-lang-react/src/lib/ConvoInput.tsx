import { ConversationUiCtrl, ConvoViewTheme } from "@convo-lang/convo-lang";
import { useSubject } from "@iyio/react-common";
import { PlusIcon, XIcon } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "./Button.js";
import { ConversationInputChange, useConversationUiCtrl, useConvoTheme } from "./convo-lang-react.js";
import { ConvoThemeIcon } from "./ConvoThemeIcon.js";
import { resizeImageDataUrlAsync } from "./media-lib.js";
import { cn } from "./util.js";

export interface ConvoInputProps
{
    className?:string;
    ctrl?:ConversationUiCtrl;
    inputName?:string;
    placeholder?:string;
    submitTrigger?:any;
    noSubmitButton?:boolean;
    beforeInput?:any;
    afterInput?:any;
    autoFocus?:boolean|number;
    autoFocusDelayMs?:number;
    onInputChange?:(change:ConversationInputChange)=>void;

    /**
     * If true media will be allowed to be attached. Commonly used to attach images. Attachments
     * are sent to the target LLM as a base64 string.
     */
    enableAttachment?:boolean;

    /**
     * Media types to accept passed to file input to limit what types of media can be attached.
     * @default "image/*"
     */
    acceptAttachmentTypes?:string;

    /**
     * Can be used to replace the default behavior of using a file input to browse for files to
     * attach. This can be used to integrated into custom media browser. If a string is returned
     * it should be a base64 url.
     */
    browseAttachmentRequested?:(accept:string)=>Promise<File|Blob|string|null|undefined>;

    /**
     * Max image width. Larger images will be resized. It is recommended to only provided max width
     * or max height.
     * @default 1024
     */
    maxImageWidth?:number;

    /**
     * Max image height. Larger images will be resize.
     */
    maxImageHeight?:number;

    theme?:ConvoViewTheme;
}

export function ConvoInput({
    className,
    ctrl: _ctrl,
    inputName='chat',
    placeholder='Enter message',
    submitTrigger,
    noSubmitButton,
    beforeInput,
    afterInput,
    autoFocus,
    autoFocusDelayMs=30,
    onInputChange,
    enableAttachment,
    acceptAttachmentTypes='image/*',
    browseAttachmentRequested,
    maxImageHeight,
    maxImageWidth=1024,
    theme,
}:ConvoInputProps){

    theme=useConvoTheme(theme);

    const ctrl=useConversationUiCtrl(_ctrl);
    const [value,setValue]=useState('');
    const ready=!!value;

    const mediaQueue=useSubject(ctrl.mediaQueueSubject);
    const media=mediaQueue[0];
    const imageUrl=media?.url??media?.getUrl?.('preview');

    const submit=(e?:FormEvent)=>{
        e?.preventDefault();
        if(ctrl.currentTask){
            return;
        }
        setValue('');
        ctrl.appendUiMessageAsync(value);
    }

    const refs=useRef({submit});
    refs.current.submit=submit;

    const [input,setInput]=useState<HTMLTextAreaElement|null>(null);
    useEffect(()=>{
        if(!input || !autoFocus){
            return;
        }
        const iv=setTimeout(()=>{
            input.focus();
        },autoFocusDelayMs);
        return ()=>{
            clearInterval(iv);
        }

    },[input,autoFocus,autoFocusDelayMs]);

    useEffect(()=>{
        if(submitTrigger!==undefined){
            refs.current.submit();
        }
    },[submitTrigger]);

    return (
        <form
            className={cn(
                theme.inputContainerClassName,
                theme.inputContainerAttachmentEnabledClassName,
                ready&&theme.inputContainerReadyClassName,
                className
            )}
            onSubmit={submit}
        >
            {!!imageUrl && <div className={theme.inputAttachmentsContainer}>
                <div className={theme.inputImageContainerClassName}>
                    <img className={theme.inputImageClassName} src={imageUrl}/>
                    <Button className={theme.inputImageRemoveButton} onClick={media?()=>ctrl.dequeueMedia(media):undefined}>
                        <ConvoThemeIcon theme={theme} icon="inputImageRemoveButtonIcon" fallback={XIcon} />
                    </Button>
                </div>
            </div>}
            <div className={theme.inputMainContentClassName}>
                {enableAttachment &&
                    <Button
                        className={theme.inputAttachmentButton}
                        elem={browseAttachmentRequested?'button':'div'}
                        onClick={browseAttachmentRequested?()=>browseAttachmentRequested(acceptAttachmentTypes):undefined}
                    >
                        <ConvoThemeIcon theme={theme} icon="inputAttachmentButtonIcon" fallback={PlusIcon}/>
                        {!browseAttachmentRequested &&
                            <input
                                accept={acceptAttachmentTypes}
                                type="file"
                                className={theme.inputAttachmentInputOverlay}
                                onChange={async e=>{
                                    if(!e.target.files){
                                        return;
                                    }
                                    for(let i=0;i<e.target.files.length;i++){
                                        const file=e.target.files.item(i);
                                        if(file){
                                            ctrl.queueMediaAsync(await resizeImageDataUrlAsync({src:file,maxWidth:maxImageWidth,maxHeight:maxImageHeight}));
                                        }
                                    }
                                }}
                            />
                        }
                    </Button>
                }

                {beforeInput}

                <textarea
                    ref={setInput}
                    className={cn(
                        theme.inputClassName,
                        theme.inputAttachmentEnabledClassName,
                        ready&&theme.inputReadyClassName
                    )}
                    placeholder={placeholder}
                    name={inputName}
                    value={value}
                    onChange={e=>{
                        setValue(e.target.value);
                        if(onInputChange){
                            onInputChange({type:'chat',value:e.target.value});
                        }
                    }}
                    onKeyDown={e=>{
                        if(e.key==='Enter' && !e.shiftKey && !e.altKey && !e.metaKey){
                            e.preventDefault();
                            submit();
                        }
                    }}
                />

                {afterInput}

                {!noSubmitButton &&
                    <Button className={cn(theme.inputSubmitButtonClassName,ready&&theme.inputSubmitReadyButtonClassName)} type="submit">
                        {theme.inputSubmitButtonIcon?<ConvoThemeIcon theme={theme} icon="inputSubmitButtonIcon" />:'submit'}
                    </Button>
                }
            </div>

        </form>
    )

}
