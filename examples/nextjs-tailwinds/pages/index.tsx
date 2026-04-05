import { ConvoView } from "@convo-lang/convo-lang-react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

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

export default function IndexPage()
{

    const [dark,setDark]=useState(true);
    const [theme,setTheme]=useState<Theme>('default');
    const [htmlTool,setHtmlTool]=useState('');


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

    return (
        <div className="w-full h-full flex relative">
            <div className="absolute right-4 top-4 cursor-pointer flex items-center gap-4">
                <select className="cursor-pointer field-sizing-content" value={theme} onChange={e=>setTheme(e.target.value as Theme)}>
                    {themes.map(t=>(
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
                <button className="cursor-pointer" onClick={()=>setDark(!dark)}>
                    <ModeIcon className="size-4"/>
                </button>
            </div>
            {!!htmlTool &&
                <div className="relative flex-1">
                    <iframe className="border-none absolute left-0 top-0 w-full h-full" srcDoc={htmlTool}/>
                </div>
            }
            <div className="max-w-200 w-full mx-auto flex flex-col flex-1 m-4 border rounded-3xl overflow-clip">
                <ConvoView
                    httpEndpoint="http://localhost:7222/api/convo-lang"
                    className="flex-1"
                    inputPlaceholder="Ask something cool"
                    enableMarkdown
                    enabledSlashCommands
                    suggestionsLocation="before-input"
                    forceInlineSuggestionsLocation
                    showFunctions
                    showResults
                    showSystem
                    enableStreaming
                    defaultValue={defaultValue}
                    externFunctions={{
                        createHtmlTool(content:string){
                            setHtmlTool(content);
                            return 'created';
                        }
                    }}
                />
            </div>
        </div>
    )
}

let lastUpdate:string='';


const t3='```'

const defaultValue=/*convo*/`
> define
__model='gpt-4.1'

> addNumber(a:number b:number)->(
    'The result is {{add(a b)}}'
)

# Creates an HTML tool the user can interact with. The value passed to this function should be a
# standalone HTML page.
> extern createHtmlTool(
    # Value use to set the srcDoc value of an iframe
    iframeContent:string
)

> assistant
hi

> user
Add 7 plus 7

`

const defaultValuex=/*convo*/`
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

> assistant
Hi 👋, how can I assist you?

@suggestionTitle Suggestions
@suggestion
> assistant
Ask about the weather

@suggestion
> assistant
Find a chicken

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

`;
