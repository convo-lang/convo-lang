import { ConversationUiCtrl, ConvoViewTheme } from "@convo-lang/convo-lang";
import { useSubject } from "@iyio/react-common";
import { ArrowUpIcon, AudioLinesIcon, CheckIcon, MicIcon, PlusIcon, SquareIcon, XIcon } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AudioVisualizer } from "./AudioVisualizer.js";
import { Button } from "./Button.js";
import { ConversationInputChange, useConversationUiCtrl, useConvoTheme } from "./convo-lang-react.js";
import { ConvoThemeIcon } from "./ConvoThemeIcon.js";
import { resizeImageDataUrlAsync } from "./media-lib.js";
import { RecordingCtrl } from "./RecordingCtrl.js";
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

    /**
     * If true the user will be able to use their microphone to record audio
     */
    enableAudioRecorder?:boolean;

    /**
     * If true the user will be able to enter into live mode where they speak directly to the LLM
     * and the LLM speaks back.
     */
    enableLiveMode?:boolean;

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
    enableAudioRecorder=false,
    enableLiveMode=false,
}:ConvoInputProps){

    theme=useConvoTheme(theme);


    const ctrl=useConversationUiCtrl(_ctrl);
    const [value,setValue]=useState('');
    const ready=!!value;

    const mediaQueue=useSubject(ctrl.mediaQueueSubject);
    const media=mediaQueue[0];
    const imageUrl=media?.url??media?.getUrl?.('preview');

    const [recorder,setRecorder]=useState<RecordingCtrl|null>(null);
    const [input,setInput]=useState<HTMLTextAreaElement|null>(null);

    const submit=(e?:FormEvent)=>{
        e?.preventDefault();
        if(ctrl.currentTask){
            return;
        }
        setValue('');
        ctrl.appendUiMessageAsync(value);
    }

    const refs=useRef({submit,theme,ctrl,input});
    refs.current.submit=submit;
    refs.current.theme=theme;
    refs.current.ctrl=ctrl;
    refs.current.input=input;

    useEffect(()=>{
         const recorder=new RecordingCtrl({
            transcribe:true,
            transcriptionService:ctrl.transcriptionService,
            onTranscription:(t,liveMode)=>{
                if(liveMode){
                    refs.current.ctrl.appendUiMessageAsync(t.text);
                }else{
                    setValue(t.text);
                    refs.current.input?.focus();
                    setTimeout(()=>{
                        refs.current.input?.focus();
                    },100);
                }
            },
        });
        setRecorder(recorder);
        return ()=>{
            recorder.dispose();
        }
    },[ctrl]);


    const isRecording=useSubject(recorder?.isRecordingSubject);
    const liveModeActive=useSubject(recorder?.liveModeActiveSubject);
    const isTranscribing=useSubject(recorder?.isTranscribingSubject);
    const audioStream=useSubject(recorder?.streamSubject);
    const [visualCanvas,setVisualCanvas]=useState<HTMLCanvasElement|null>(null);

    useEffect(()=>{
        if(!isRecording || !visualCanvas || !audioStream){
            return;
        }
        const visualizer=new AudioVisualizer({
            stream:audioStream,
            canvas:visualCanvas,
            activeColorCssVarName:refs.current.theme.inputLiveModeVisualizerActiveVarName,
        });
        const sub=recorder?.speechActiveSubject.subscribe(v=>{
            visualizer.active=v??false;
        })
        visualizer.run();
        return ()=>{
            sub?.unsubscribe();
            visualizer.dispose();
        }
    },[visualCanvas,isRecording,audioStream,recorder]);

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
                    <Button className={cn(theme.iconButtonClassName,theme.inputImageRemoveButton)} onClick={media?()=>ctrl.dequeueMedia(media):undefined}>
                        <ConvoThemeIcon theme={theme} icon="inputImageRemoveButtonIcon" fallback={XIcon} />
                    </Button>
                </div>
            </div>}
            <div className={theme.inputMainContentClassName}>
                {enableAttachment &&
                    <Button
                        className={cn(theme.iconButtonClassName,theme.inputAttachmentButton)}
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

                <div className={theme.inputClassWrapperName}>

                    <textarea
                        ref={setInput}
                        className={cn(
                            theme.inputClassName,
                            theme.inputAttachmentEnabledClassName,
                            ready&&theme.inputReadyClassName
                        )}
                        style={(isRecording || isTranscribing)?{opacity:0,visibility:'hidden'}:undefined}
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
                    {isRecording &&
                        <canvas
                            className={theme.inputRecordingVisualizerCanvasClassName}
                            ref={setVisualCanvas}
                        />
                    }
                    <div className={theme.inputMessageContainerClassName}>
                        {(isTranscribing && !liveModeActive)&&<>
                            Transcribing
                            <ConvoThemeIcon theme={theme} icon="inputTranscribeIcon"/>
                        </>}
                    </div>
                </div>

                {afterInput}

                {enableAudioRecorder && !(liveModeActive && isRecording) &&
                    <Button className={cn(theme.iconButtonClassName,theme.inputAudioRecorderButtonClassName)} onClick={()=>{
                        recorder?.toggle();
                    }}>
                        <ConvoThemeIcon
                            theme={theme}
                            icon={!isRecording?"inputAudioRecorderButtonIcon":"inputAudioRecorderSubmitButtonIcon"}
                            fallback={!isRecording?MicIcon:CheckIcon}
                        />
                    </Button>
                }

                {isRecording?
                    <Button className={cn(theme.iconButtonClassName,theme.inputAudioRecorderCancelButtonClassName)} onClick={()=>{
                        recorder?.cancel();
                    }}>
                        <ConvoThemeIcon
                            theme={theme}
                            icon={enableLiveMode?"inputAudioRecorderStopLiveButtonIcon":"inputAudioRecorderCancelButtonIcon"}
                            fallback={enableLiveMode?SquareIcon:XIcon}
                        />
                        {isTranscribing && enableLiveMode &&
                            <div className={theme.inputAudioRecorderLiveTranscribeIconContainerClassName}>
                                <ConvoThemeIcon theme={theme} icon="inputAudioRecorderLiveTranscribeIcon"/>
                            </div>
                        }
                    </Button>
                :!noSubmitButton?
                    <Button className={cn(
                        theme.iconButtonClassName,
                        theme.inputSubmitButtonClassName,
                        (ready || enableLiveMode)&&theme.inputSubmitReadyButtonClassName
                    )} onClick={()=>{
                        if(!ready && enableLiveMode){
                            recorder?.start({enableLiveMode:true})
                        }else{
                            submit();
                        }
                    }}>
                        <ConvoThemeIcon
                            theme={theme}
                            icon={(enableLiveMode && !ready)?"inputLiveModeButtonIcon":"inputSubmitButtonIcon"}
                            fallback={(enableLiveMode && !ready)?AudioLinesIcon:ArrowUpIcon}
                        />
                    </Button>
                :
                    null
                }
            </div>

        </form>
    )

}
