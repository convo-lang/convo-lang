import { staticContent } from "@/lib/static-site-content";
import { parseConvoCode } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { ScrollView, SlimButton, View } from "@iyio/react-common";
import { LazyCodeInput } from "@iyio/syn-taxi";
import { useState } from "react";
import { AgentView } from "../components/AgentView";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const convoScript=/*convo*/`

> define
langName="Convo-Lang"

> system
You are teaching a prompt engineer a really cool 
and existing programming language called {{langName}}

<about-convo-lang>
{{staticContent.learn_convo_lang_md}}
</about-convo-lang>

Any time you would need to respond with an answer that
would required a markdown style code fence containing
Convo-Lang call the showExample function.

# Shows an example Convo-Lang script. Do not repeat
# the example script in your next response and do not
# tell the user you have shown them the example,
# they will see it.
> extern showExample(
    # Name of the example in kebab-case
    name:string
    # The example Convo-Lang script. Do not inclose
    # any of the script in code markdown style
    # code fences using (\`\`\`)
    convoScript:string
)

> assistant
Hi 👋, I'm Doc. I'm here to help you learn {{langName}}.

> assistant
Ask me any questions you have about {{langName}}. I can also show examples of how to use {{langName}}.

> assistant
Oh, and last thing, you can use slash commands to preform special actions.

Enter "/help" to see a full list of all slash commands

@suggestionTitle Common questions
@suggestion
> assistant
What is {{langName}}

@suggestion
> assistant
Show me an example of a function

@suggestion
> assistant
Show me how to use tags

@suggestion
> assistant
Show me how to use variables


`;

export default function Index(){

    const [examples,setExamples]=useState<{name:string,convoScript:string}[]>([]);
    const [code,setCode]=useState(defaultExampleConvo);
    const [name,setName]=useState('Default');

    const showExample=(name:string,convoScript:string)=>{
        setName(name);
        setCode(convoScript);
        const ln=name.toLowerCase();
        if(!examples.some(e=>e.name===ln)){
            setExamples([{name,convoScript},...examples])
        }
        return 'Example shown to user'
    }
    
    return (
        <AgentView
            convoScript={convoScript}
            externFunctions={{showExample}}
            defaultVars={{staticContent}}
        >
            
            {examples.length?
                <ScrollView direction="x" className={style.header()} containerClassName={style.tabs()}>
                    {examples.map((e,i)=>(
                        <SlimButton
                            key={i}
                            onClick={()=>{setCode(e.convoScript);setName(e.name)}}
                            className={style.tab({active:name===e.name})}
                        >
                            {e.name}
                        </SlimButton>
                    ))}
                </ScrollView>
            :
                <View row g1 p050 className={style.header()}>
                    Example Convo-Lang scripts
                </View>
            }
            <ScrollView flex1 containerFill containerCol>
                <LazyCodeInput
                    flex1
                    language="convo"
                    value={code}
                    onChange={setCode}
                    parser={parseConvoCode}
                    lineNumbers
                    logParsed
                />
            </ScrollView>

        </AgentView>
    );
}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'Index',css:`
    @.header{
        display:flex;
        flex-direction:column;
        border-bottom:1px solid #444;
    }
    @.tabs{
        display:flex;
        gap:0.5rem;
        padding:0.5rem;
    }
    @.tab{
        padding:0.2rem 0.6rem;
        border:1px solid #444;
        border-radius:100px;
        font-size:0.9rem;
        color:#999;
    }
    @.tab.active{
        color:#fff;
    }

`});

const defaultExampleConvo=/*convo*/`// This is an example of a Convo-Lang script.

// You can as Doc, the Convo-Lang mascot to show you
// examples of of how to use Convo-Lang.


// Define messages allow you to define variable and data structure
> define
agentName="Ricky"
Car = struct(
    color:string
    horsePower:number
)


// Functions allow you to define tools for an LLM to use
> extern buildCar(
    budge:number
    car:Car
)


// System messages control the personality and more of the LLM
> system
You are a very funny race car driver named {{agentName}}


// Assistant messages represent message sent from the LLM
> assistant
Hi, my name is {{agentName}}


// The @suggestion tag displays a suggestions to the user
@suggestion
> assistant
How is your day going?


// User messages represent message sent from the user
> user
This is a user message sent form the user
`