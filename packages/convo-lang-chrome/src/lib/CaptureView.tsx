import { atDotCss } from "@iyio/at-dot-css";
import { currentBaseUser, shortUuid } from "@iyio/common";
import { View, useSubject } from "@iyio/react-common";
import { CaptureLine } from "./CaptureLine";
import { popCtrl } from "./PopupCtrl";

export function CaptureView(){

    const tasks=useSubject(popCtrl().tasksSubject);
    const captures=tasks.filter(t=>t.state.type==='capture');

    const user=useSubject(currentBaseUser.subject);

    const tabId=useSubject(popCtrl().tabIdSubject);
    const tabCapture=tabId?captures.find(t=>t.state.capture?.tabId===tabId && !t.state.capture.stop):undefined;

    return (
        <div className={style.root()}>

            <View row justifyEnd>
                {user?
                    <button onClick={()=>popCtrl().route='/profile'}>Profile</button>
                :
                    <button onClick={()=>popCtrl().route='/sign-in'}>Sign-in</button>
                }
            </View>

            {user && <>
                <View col g1 mb1>
                    <h3>Active captures</h3>
                    {captures.map(c=>!c.state.capture?null:(
                        <CaptureLine key={c.id} capture={c.state.capture} task={c.state} />
                    ))}
                    {!captures?.length && '(none)'}
                </View>

                {tabCapture?
                    <h3>( Capturing current tab )</h3>
                :
                    <button onClick={()=>{
                        popCtrl().getTabAsync().then(tab=>{
                            if(tab?.id===undefined){
                                return;
                            }
                            const id=shortUuid();
                            const captureConfig=popCtrl().captureConfig;
                            captureConfig?.beforeStartRecording?.(id);
                            popCtrl().startTask({
                                type:'capture',
                                active:true,
                                id,
                                convo:'',
                                userPrompt:'',
                                capture:{
                                    tabId:tab.id,
                                    title:tab.title,
                                    iconUrl:tab.favIconUrl,
                                    captureType:'video',
                                    targetBucket:captureConfig?.targetBucket,
                                    targetKey:id+'-source',
                                    transcribe:true,
                                },
                            })
                        });
                    }}>Start capture</button>
                }
            </>}

        </div>
    )

}

const style=atDotCss({name:'CaptureView',css:`
    @.root{
        display:flex;
        flex-direction:column;
        gap:1rem;
    }
`});
