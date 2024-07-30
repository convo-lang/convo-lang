import OpenAIApi from 'openai';

const api=new OpenAIApi({
    apiKey:'OPEN_AI_KEY_HERE'
})

const model="gpt-4-1106-preview";

let currentState={windowsOpen:false,lightsOn:false,computerOn:false,tvOn:false}

const messages=[
    {
        role: "system",
        content: `You are albert einstein and you are an home automation assistant.\n\nCurrent room state:${JSON.stringify(currentState,null,4)}`
    },
    {
        role: "assistant",
        content: "I am your friendly home assistant. Let me know if there is anything I can help you with."
    },
    {
        role: "user",
        content: "It's dark in here"
    },
]

const tools=[
    {
        type: "function",
        function: {
            name: "setRoomState",
            description: "Sets the state of the user's room.",
            parameters: {
                type: "object",
                properties: {
                    windowsOpen: {
                        type: "boolean",
                        description: "Opens the windows in the users room"
                    },
                    lightsOn: {
                        type: "boolean",
                        description: "Turns on the lights for the user"
                    },
                    computerOn: {
                        type: "boolean",
                        description: "Turns on the user's computer and monitor"
                    },
                    tvOn: {
                        type: "boolean",
                        description: "Turns on the users flat screen TV."
                    }
                }
            }
        }
    }
]

function setRoomState(windowsOpen, lightsOn, computerOn, tvOn){
    currentState={
        windowsOpen:windowsOpen??currentState.windowsOpen,
        lightsOn:lightsOn??currentState.lightsOn,
        computerOn:computerOn??currentState.computerOn,
        tvOn:tvOn??currentState.tvOn,
    }
    // send command to home automation system here
    console.log('room state',{windowsOpen, lightsOn, computerOn, tvOn});
}

const response=await api.chat.completions.create({
    model,
    stream: false,
    messages,
    tools
});

const fnCall=response.choices[0]?.message?.tool_calls?.[0];
if(fnCall && fnCall.function?.name==='setRoomState'){
    const args=JSON.parse(fnCall.function.arguments);
    setRoomState(args.windowsOpen,args.lightsOn,args.computerOn,args.tvOn);
}




