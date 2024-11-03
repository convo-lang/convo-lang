import { atDotCss } from "@iyio/at-dot-css";
import { useState } from "react";
import { AgentView } from "../components/AgentView";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const convoScript=/*convo*/`

// You can use variables to store repeated information
// Here we are defining some variables to create an agent
> define
agentType="Diet and Exercise"
agentName="Jesper"
agentPersonality="friendly"

// Use the system message to control the behavior of your agent
> system
Your name is {{agentName}} and you are a {{agentPersonality}} helpful
{{agentType}} assistant. Keep your responses short and straight to the point.

Keep you responses short and straight to the points.

Use the createWorkoutPlan function to create workout plans for the user.

> extern createWorkoutPlan(
    # the workout plan in markdown format
    plan:string
)

> assistant
Hi 👋, my name is {{agentName}}, I'll be helping you with {{agentType}}.

@suggestion
> assistant
Create a vegan diet plan

@suggestion
> assistant
Create a 10 minute workout plan

@suggestion
> assistant
How do I build muscle?



`;

export default function Basic(){

    const [plan,setPlan]=useState('');

    const createWorkoutPlan=(plan:string)=>{
        setPlan(plan)
        return 'Workout plan created'
    }
    
    return (
        <AgentView
            convoScript={convoScript}
            externFunctions={{createWorkoutPlan}}
        >
            
            <div className={style.plan()}>
                {plan||'Ask your fitness trainer to create a workout plan for you'}
            </div>

        </AgentView>
    );
}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'Basic',css:`
    @.plan{
        white-space:pre-wrap;
        padding:2rem;
        flex:1;
        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;
    }

`});
