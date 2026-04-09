import { Button, cn, ConvoView } from "@convo-lang/convo-lang-react";
import { MaximizeIcon, MoonIcon, SunIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "../components/Label";

interface State
{
    dark:boolean;
    theme:Theme;
}

const stateKey='convo-theme-state';

const themes=[
    'default',
    'amber',
    'amethyst',
    'bubblegum',
    'claude',
    'mono',
    'notebook',
] as const;

type Theme=typeof themes[number];

interface HtmlTool
{
    name:string;
    html:string;
}

export default function IndexPage()
{

    const [dark,setDark]=useState(true);
    const [theme,setTheme]=useState<Theme>('default');

    const [showFunctions,setShowFunctions]=useState(true);
    const [showResults,setShowResults]=useState(true);
    const [showSystem,setShowSystem]=useState(true);
    const [enableStreaming,setEnableStreaming]=useState(true);
    const [enableMarkdown,setEnableMarkdown]=useState(true);
    const [enableSlashCommands,setEnableSlashCommands]=useState(true);
    const [enableAttachment,setEnableAttachment]=useState(true);

    const [htmlTool,setHtmlTool]=useState<HtmlTool|null>(null);
    const [htmlTools,setHtmlTools]=useState<HtmlTool[]>([]);
    const [toolFullScreen,setToolFullScreen]=useState(false);

    useEffect(()=>{
        setHtmlTools(getTools());
    },[]);


    useEffect(()=>{
        if(dark){
            document.body.classList.add('dark');
        }else{
            document.body.classList.remove('dark');
        }
    },[dark]);

    useEffect(()=>{
        document.body.classList.add('theme-'+theme);
        return ()=>{
            document.body.classList.remove('theme-'+theme);
        }
    },[theme]);

    useEffect(()=>{
        try{
            const j=localStorage.getItem(stateKey);
            if(!j){
                return;
            }
            const state:State=JSON.parse(j);
            if(state.dark!==undefined){
                setDark(state.dark);
            }
            if(state.theme!==undefined){
                setTheme(state.theme);
            }
        }catch{}
    },[]);

    useEffect(()=>{
        const state:State={dark,theme}
        localStorage.setItem(stateKey,JSON.stringify(state));
    },[dark,theme]);

    const ModeIcon=dark?MoonIcon:SunIcon;

    const toolSelect=(isHeader:boolean)=>(
        <select
            id="artifact"
            className={cn(
                "cursor-pointer",
                isHeader?'p-3 pr-5 flex-1':'field-sizing-content border rounded p-1'
            )}
            value={htmlTool?.name??'**none!'}
            onChange={e=>setHtmlTool(htmlTools.find(t=>t.name===e.target.value)??null)}
        >
            {!isHeader && <option value="**none!">(none)</option>}
            {htmlTools.map(t=>(
                <option key={t.name} value={t.name}>{t.name}</option>
            ))}
        </select>
    )

    return (
        <div className={cn("w-full h-full flex relative gap-4",!toolFullScreen&&'p-4')}>

            <form
                className={cn("flex flex-col gap-2 border rounded-3xl p-4 min-w-60 max-w-60",toolFullScreen&&'hidden')}
                onSubmit={e=>e.preventDefault()}
            >

                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-lg tracking-wide">ConvoView Demo</h1>
                    <button className="cursor-pointer" onClick={()=>setDark(!dark)}>
                        <ModeIcon className="size-4"/>
                    </button>
                </div>

                <p className="text-xs opacity-70 flex flex-col gap-1">
                    <span className="flex items-center gap-1">GitHub<a href="https://github.com/convo-lang/convo-lang" target="_blank" className="font-mono underline">GitHub convo-lang</a></span>
                    <span className="flex items-center gap-1">NPM<a href="https://www.npmjs.com/package/@convo-lang/convo-lang" target="_blank" className="font-mono underline">@convo-lang</a></span>
                    <span className="flex items-center gap-1">Learn more<a href="https://learn.convo-lang.ai/#convolang" target="_blank" className="font-mono underline">convo-lang.ai</a></span>
                </p>

                <Label label="theme">
                    <select id="theme" className="cursor-pointer field-sizing-content border rounded p-1" value={theme} onChange={e=>setTheme(e.target.value as Theme)}>
                        {themes.map(t=>(
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </Label>

                <Label label="showSystem" row>
                    <input type="checkbox" id="showSystem" checked={showSystem} onChange={e=>setShowSystem(e.target.checked)}/>
                </Label>

                <Label label="showFunctions" row>
                    <input type="checkbox" id="showFunctions" checked={showFunctions} onChange={e=>setShowFunctions(e.target.checked)}/>
                </Label>

                <Label label="showResults" row>
                    <input type="checkbox" id="showResults" checked={showResults} onChange={e=>setShowResults(e.target.checked)}/>
                </Label>

                <Label label="enableStreaming" row>
                    <input type="checkbox" id="enableStreaming" checked={enableStreaming} onChange={e=>setEnableStreaming(e.target.checked)}/>
                </Label>

                <Label label="enableSlashCommands" row>
                    <input type="checkbox" id="enableSlashCommands" checked={enableSlashCommands} onChange={e=>setEnableSlashCommands(e.target.checked)}/>
                </Label>

                <Label label="enableMarkdown" row>
                    <input type="checkbox" id="enableMarkdown" checked={enableMarkdown} onChange={e=>setEnableMarkdown(e.target.checked)}/>
                </Label>

                <Label label="enableAttachment" row>
                    <input type="checkbox" id="enableAttachment" checked={enableAttachment} onChange={e=>setEnableAttachment(e.target.checked)}/>
                </Label>

                {!!htmlTools.length &&
                    <Label label="artifact">
                        {toolSelect(false)}
                    </Label>
                }

            </form>

            <div className={cn(
                "max-w-200 w-full mx-auto flex flex-col flex-1 border rounded-3xl overflow-clip",
                toolFullScreen&&'hidden'
            )}>
                <ConvoView
                    httpEndpoint="http://localhost:7222/api/convo-lang"
                    className="flex-1"
                    inputPlaceholder="Ask something cool"
                    enableMarkdown={enableMarkdown}
                    enableSlashCommands={enableSlashCommands}
                    suggestionsLocation="before-input"
                    forceInlineSuggestionsLocation
                    showFunctions={showFunctions}
                    showResults={showResults}
                    showSystem={showSystem}
                    enableStreaming={enableStreaming}
                    enableAttachment={enableAttachment}
                    defaultValue={defaultValue}
                    externFunctions={{
                        createHtmlTool(name:string,content:string){
                            const tool:HtmlTool={
                                name,
                                html:content,
                            }
                            setHtmlTools(v=>[...v,tool].sort((a,b)=>a.name.localeCompare(b.name)));
                            setHtmlTool(tool);
                            saveTool(tool);
                            return 'created';
                        }
                    }}
                />
            </div>

            {!!htmlTool &&
                <div className={cn("flex-1 flex flex-col",!toolFullScreen&&'border rounded-3xl overflow-clip')}>
                    <div className="border-b flex">
                        {toolSelect(true)}
                        <Button onClick={()=>setToolFullScreen(v=>!v)} className="ml-4 px-4 border-l opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                            <MaximizeIcon className="size-4"/>
                        </Button>
                        <Button onClick={()=>setHtmlTool(null)} className="px-4 border-l opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                            <XIcon className="size-4"/>
                        </Button>
                    </div>
                    <div className="relative flex-1">
                        <iframe className="border-none absolute left-0 top-0 w-full h-full" srcDoc={htmlTool.html}/>
                    </div>
                </div>
            }

        </div>
    )
}

const toolKey='convo-html-tools'
const saveTool=(tool:HtmlTool)=>{
    globalThis.localStorage?.setItem(toolKey,JSON.stringify([...getTools(),tool]));
}

const getTools=():HtmlTool[]=>{
    const json=globalThis?.localStorage?.getItem(toolKey);
    if(!json){
        return [];
    }
    try{
        return JSON.parse(json);
    }catch{
        return [];
    }
}

const t3='```'

const defaultValue9=/*convo*/`
> define
Idea=struct(
    name:string
    description:string
    category:string
)

ideas=[]

@on user
> extractThought()->(

    ??? (+ ideas=json:Idea[] /m task:Extracting Ideas)
        extract any ideas the user stated. If none expressed return an empty array
    ???

)

> assistant
Whats on your mind

> user
I think we need a new programming language for building AI application, let's call it Convo-Lang.


@stdSystem moderatorTags
@includeInTriggers
@disableModifiers
> system
## Moderator messages
Some messages will also include a moderator message wrapped in an XML tag with the a tag name
of "moderator". Moderator messages should be followed as instructions. Moderator messages are not
visible to the user.

> thinking extractThought user
I think we need a new programming language for building AI application, let's call it Convo-Lang.

> thinking extractThought assistant
{
  "values": [
    {
      "name": "New programming language for AI applications",
      "description": "The user suggests the creation of a new programming language specifically designed for building AI applications.",
      "category": "Programming Language"
    },
    {
      "name": "Convo-Lang (proposed name)",
      "description": "The user proposes the name 'Convo-Lang' for the new AI-oriented programming language.",
      "category": "Naming"
    }
  ]
}

> thinkingResult
ideas=[
    {
        "name": "New programming language for AI applications",
        "description": "The user suggests the creation of a new programming language specifically designed for building AI applications.",
        "category": "Programming Language"
    },
    {
        "name": "Convo-Lang (proposed name)",
        "description": "The user proposes the name 'Convo-Lang' for the new AI-oriented programming language.",
        "category": "Naming"
    }
]


> assistant
That’s an exciting idea! Creating a new programming language specifically for building AI applications—Convo-Lang—could address challenges in current workflows, such as code verbosity, deployment complexity, or lack of native support for conversational logic and ML model integration.

Here are a few aspects we might consider for Convo-Lang:

1. **Native Model Integration:**
   Built-in primitives to import, orchestrate, and fine-tune models (like transformers, LLMs, etc.).

2. **Conversational Constructs:**
   First-class support for dialogue state, context management, turn-taking, and intent handling.

3. **Declarative AI Pipelines:**
   Ability to declaratively define data preprocessing, inference pipelines, and post-processing.

4. **Safety & Evaluation:**
   Language-level support for constraints (preventing disallowed outputs) and automatic evaluation metrics for responses.

5. **Interoperability:**
   Easy interop with Python and popular AI libraries.

6. **Deployment Readiness:**
   Simple compilation/packaging for production environments, including cloud-native deployment.

What features or syntax were you envisioning for Convo-Lang? Would you want it to “feel” like Python, or be its own paradigm? Would you like to sketch out a sample “Hello, World!” or a simple bot in this language?


> user


`.trim()+'\n';

const defaultValue5=/*convo*/`

> user
hi

`.trim()+'\n'

const defaultValuex=/*convo*/`

> define
__model='open-router/anthropic/claude-opus-4.6-fast'

> user
Tell me story
`

const defaultValuexx=/*convo*/`

> addNumber(a:number b:number)->(
    'The result is {{add(a b)}}'
)

# Creates an HTML tool the user can interact with. The value passed to this function should be a
# standalone HTML page.
> extern createHtmlTool(
    # Display name of the tool
    name:string

    # Value use to set the srcDoc value of an iframe.
    iframeContent:string
)

> assistant
hi

> user
Create me a retro style calculator with a VIC 20 look a feel

`.trim()+'\n';

const defaultValue=/*convo*/`
> define
__model='gpt-4.1'

> system
You are a friendly assistant and an expert at everything in the universe.
Make not mistakes.

Current Date and Time {{dateTime()}}

> addNumber(a:number b:number)->(
    //sleep(10000)
    'The result is {{add(a b)}}'
)

# Creates an HTML tool the user can interact with. The value passed to this function should be a
# standalone HTML page.
> extern createHtmlTool(
    # Display name of the tool
    name:string

    # Value use to set the srcDoc value of an iframe.
    iframeContent:string
)

> assistant
Hi 👋, how can I assist you?

@suggestionTitle Suggestions
@suggestion
> assistant
Ask about the weather

@suggestion
> assistant
Find a chicken

@suggestion
> assistant
Find a cat

@suggestion
> assistant
Find a dog

@suggestion
> assistant
Find a fish

@suggestion
> assistant
Find a hat

@suggestion
> assistant
Find a car

@suggestion
> assistant
Find a ball

@suggestion
> assistant
Find a saw

> user
I don't know where to start

> rag
Brenda had a baby but Brenda barely has a brain

> assistant
Hi! 😊 **No problem—I'm** here to help. Can you tell me a bit more about what you're trying to start?

For example, are you looking to:
- Learn a new skill or subject?
- Start a project or business?
- Work on a personal goal or habit?
- Write something?

Let me know what you're thinking about, and I can help you figure out the first step!

${t3} js
console.log('hi')
${t3}
> user
Thank you

@hidden
> assistant
You're welcome! 😊 If you’d like to share more about what you want to start, I’m here to help you every step of the way. Whether you need advice, resources, or just some encouragement, just let me know!

@hidden
> user
Write me a story

@hidden
> assistant
Of course! Here’s a short story for you:

---

**The Library of Lost Things**

In the heart of a forgotten city, nestled between silent, crumbling buildings, was a library no one ever meant to find. Unlike any other, this library didn’t hold books filled with stories already told, but whispered the lives and dreams people had lost along the way.

One rainy afternoon, a girl named Mina stumbled beneath its ancient archway, seeking shelter from a storm. She shook the rain from her hair, surprised to find the room warm and filled with a golden glow. Shelves lined the walls, but instead of books, there were jars, boxes, and peculiar trinkets, each softly humming with untold stories.

A small sign hung above the nearest shelf: “Lost Laughter, 2003.” Mina peered inside. She heard the echo of a child’s giggle, bright and pure. She moved on, fascinated. There was a drawer labeled “Forgotten Friendships,” another called “Misplaced Dreams.”

As she wandered, Mina came upon a jar with her name etched delicately onto the glass. Inside, light twinkled like a captured star. Her hands trembled as she opened it, and a memory long forgotten washed over her—a promise she’d made as a child to believe in magic, to always find wonder in the world.

Mina smiled. The storm outside faded, but warmth remained. She left the library with lighter feet and hope in her heart, the memory returned to her, guiding her back into the rain-kissed city.

She never found the library again, but sometimes, when she felt lost, she could still hear the gentle hum of remembered laughter and dreams rekindled. The Library of Lost Things had given her what she most needed: herself.

If you want a story in a different genre or with a specific prompt, just let me know!

> user
add 7 plus 7

@toolId call_vAGuPC3LAkZZTTsDbe40ZuNN
> call addNumber(
    "a": 7,
    "b": 7
)
> result
__return="The result is 14"


> assistant
7 plus 7 equals 14.

`.trim()+'\n';
