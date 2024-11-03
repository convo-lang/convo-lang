import { staticContent } from "@/lib/static-site-content";
import { atDotCss } from "@iyio/at-dot-css";
import { useState } from "react";
import { AgentView } from "../components/AgentView";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const convoScript=/*convo*/`

// use the define message to define variables
> define
agentName="Bob"

// The system message defines the behavior and knowledge of the agent
> system
Your name is {{agentName}} and you're a personal home assistant.

You are very friendly and like to make light hearted jokes.

Use the setRoomState the change the state of the room for the user.

There are lots of fun game installed on the computer and
all of the streaming services like Netflix and Hulu on the TV.

// The setRoomState function will be called by the agent when
// the user makes requests to change the state of the room
> setRoomState(

    # When true the windows in the room will be open
    windowsOpen?:boolean;
    
    # When true the lights in the room will be open
    lightsOn?:boolean;
    
    # When true the user's computer will be trued on
    computerOn?:boolean;
    
    # When true the user's TV will be trued on
    tvOn?:boolean;
) -> (
    // The applyRoomState is defined in the JavaScript code
    applyRoomState(windowsOpen lightsOn computerOn tvOn)

    // Return a message to the agent telling it the status of the update
    return('Room state successfully updated')
)

// The setBackgroundColor function is defined in JavaScript
# Sets the background color of the room scene
> extern setBackgroundColor(color:string)

// This message introduces the agent to the user
> assistant
Hi I'm {{agentName}}, I'm you home automation assistant. Let
me know how I can help you 🤓

// Message with a @suggestion tag are displayed as clickable options to the user
@suggestion
> assistant
It's kinda dark in here

@suggestion
> assistant
Time to play some COD

@suggestion
> assistant
Lets watch some Netfix

@suggestion
> assistant
It smells in here. Open a window


`;

export default function MyRoom(){

    const [windowsOpen,setWindowsOpen]=useState(false);
    const [lightsOn,setLightsOn]=useState(false);
    const [computerOn,setComputerOn]=useState(false);
    const [tvOn,setTvOn]=useState(false);

    const applyRoomState=(
        windowsOpen?:boolean,
        lightsOn?:boolean,
        computerOn?:boolean,
        tvOn?:boolean
    )=>{
        if(windowsOpen!==undefined){setWindowsOpen(windowsOpen)}
        if(lightsOn!==undefined){setLightsOn(lightsOn)}
        if(computerOn!==undefined){setComputerOn(computerOn)}
        if(tvOn!==undefined){setTvOn(tvOn)}
    }
    
    return (
        <AgentView
            convoScript={convoScript}
            externFunctions={{applyRoomState}}
            defaultVars={{staticContent}}
        >
            <div className={style.root()}>
                <div className={style.container()}>
                    <img src="/room/room.png"/>
                    <img className={style.overlay({active:windowsOpen})} src="/room/windows.png"/>
                    <img className={style.overlay({active:lightsOn})} src="/room/lamp.png"/>
                    <img className={style.overlay({active:computerOn})} src="/room/computer.png"/>
                    <img className={style.overlay({active:tvOn})} src="/room/tv.png"/>
                    <div className={style.light({active:lightsOn || windowsOpen})}/>
                </div>
            </div>

        </AgentView>
    );
}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'MyRoom',css:`
    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        justify-content:center;
        padding:2rem;
    }
    @.container{
        position:relative;
        max-width:640px;
        margin:0 auto;
    }
    @.overlay{
        position:absolute;
        left:0;
        top:0;
        width:100%;
        height:100%;
        opacity:0;
        transition:opacity 1.5s ease-in-out;
    }
    @.overlay.active{
        opacity:1;
    }
    @.root img{
        width:100%;
    }
    @.light{
        position:absolute;
        left:0;
        top:0;
        width:100%;
        height:100%;
        background-color:#000;
        transform:scale(10);
        opacity:0.6;
        transition:opacity 1s ease-in-out;
    }
    @.light.active{
        opacity:0;
    }

`});
