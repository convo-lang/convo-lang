import { Gen, GenImg, GenMetadata } from "@convo-lang/convo-lang-react";
import { atDotCss } from "@iyio/at-dot-css";
import { aryRandomValue, delayAsync } from "@iyio/common";
import { ScrollView, SlimButton, Text, View } from "@iyio/react-common";
import { VfsItem } from "@iyio/vfs";
import { useVfsDirItems } from "@iyio/vfs-react";
import { useEffect, useState } from "react";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const sharedConvo=/*convo*/`

    > define
    Attack = struct(
        name: string
        description: string
        # The number of hit points the attach takes from an opponent
        power:number
    )

    Creature = struct(
        name:string
        visualDescription:string
        # Hit Points - range: 1 to 100
        hp:number
        attacks:array(Attack)

    )

    Level = struct(
        name:string
        # A visual description of the background of the level
        visualDescription:string
    )

    > system
    You are an expert and creative game designer creating a game based on the following book.

    <book>
    {{readDoc(docPath useVision:true)}}
    </book>


    @condition userInstructions
    @concat
    > system
    Take into considerations the following user instructions
    <user-instructions>
    {{userInstructions}}
    </user-instructions>

`



export default function PdfAdventure(){

    const [screen,setScreen]=useState<'upload'|'adventure'|'win'|'lose'>('upload');
    const end=screen==='win' || screen=='lose';

    const [artStyle,setArtStyle]=useState('60\'s retro');

    const [levelIndex,setLevelIndex]=useState(0);
    const [levels,setLevels]=useState<Level[]>([]);
    const [levelCreatures,setLevelCreatures]=useState<Creature[]>([]);
    const [liveCreatures,setLiveCreatures]=useState<Creature[]>([]);
    useEffect(()=>{
        setLiveCreatures([...levelCreatures]);
    },[levelCreatures]);

    const [selectedCreature,setSelectedCreature]=useState<Creature|null>(null);
    const [selectedCreatureAttack,setSelectedCreatureAttack]=useState<Attack|null>(null);

    const [playerCreature,setPlayerCreature]=useState<Creature|null>(null);
    const [selectedAttack,setSelectedAttack]=useState<Attack|null>(null);
    const [usedAttacks,setUsedAttacks]=useState<Attack[]>([]);

    const [hpMap,setHpMap]=useState<Record<string,number>>({});

    const [locked,setLocked]=useState(false);


    const [userInstructions,setUserInstructions]=useState('');
    const docs=useVfsDirItems('pdf')?.filter(d=>d.name.toLowerCase().endsWith('.pdf'));
    docs?.sort((a,b)=>a.name.localeCompare(b.name));
    const [doc,setDoc]=useState<VfsItem|null>(null);

    const attackCreature=async (creature:Creature)=>{
        if(!selectedAttack || locked || !playerCreature){
            return;
        }
        setUsedAttacks(v=>v.length===playerCreature.attacks.length-1?[]:[...v,selectedAttack]);
        const ck=getCreatureKey(levelIndex,creature);
        const hp=Math.max(0,(hpMap[ck]??creature.hp)-selectedAttack.power);
        let lc=liveCreatures;
        const pc={...playerCreature};
        if(!hp){
            lc=liveCreatures.filter(c=>c.name!==creature.name)
            setLiveCreatures(lc);
            pc.hp+=Math.round(5+Math.random()*(creature.hp/2));
            setPlayerCreature({...pc})
        }
        const updatedMap={...hpMap,[ck]:hp}
        setHpMap(updatedMap);

        setSelectedAttack(null);
        if(!lc.length){
            pc.hp+=50;
            if(levelIndex===levels.length-1){
                setScreen('win');
                return;
            }
            setPlayerCreature({...pc})
            setSelectedCreatureAttack(null);
            setSelectedCreature(null);
            setLevelIndex(v=>v+1);
            return;
        }

        setLocked(true);
        try{

            let ci=-1;
            if(lc.length>1){
                const iv=setInterval(()=>{
                    ci++;
                    setSelectedCreature(lc[ci%lc.length]??null);
                },150);

                await delayAsync(Math.round(2000+(2000*Math.random())))
                clearInterval(iv);
            }else{
                setSelectedCreature(lc[0]??null);
                ci=0;
            }

            const attackC=lc[ci%lc.length];
            if(!attackC){
                return;
            }

            const attack=aryRandomValue(attackC.attacks);
            if(!attack){
                return;
            }
            setSelectedCreatureAttack(attack);
            await delayAsync(1500);


            setSelectedCreatureAttack(null);
            setSelectedCreature(null);
            pc.hp=Math.max(0,pc.hp-attack.power);
            setPlayerCreature({...pc});

            if(!pc.hp){
                setScreen('lose');
            }


        }finally{
            setLocked(false);
        }
    }

    if(screen==='upload'){
        return (
            <View flex1 col centerBoth g1>
                <div className={style.card()}>
                    <Text text="Instructions"/>
                    <Text sm opacity050 text="Use the instructions below to customize the you adventure"/>
                    <textarea placeholder="Enter instructions here" className={style.textArea()} value={userInstructions} onChange={e=>setUserInstructions(e.target.value)}/>

                    <Text mt1 text="Art Style"/>
                    <input className={style.textInput()} type="text" value={artStyle} onChange={e=>setArtStyle(e.target.value)}/>

                    <Text mt1 text="Select a document to start your adventure"/>
                    {docs?.map(d=>(
                        <SlimButton className={style.btn()} key={d.path} onClick={()=>{
                            setDoc(d);
                            setScreen('adventure')
                        }}>{d.name}</SlimButton>
                    ))}
                </div>
            </View>
        )
    }

    return (<div className={style.root()} style={style.vars({containerBg:'#000000cc'})}>
        <GenMetadata artStyle={`${artStyle} dark mode`}>
        <Gen
            cache
            vars={{docPath:doc?.path??'',userInstructions}}
            sharedConvo={sharedConvo}
            convo={/*convo*/`

                @json Level[]
                > user
                Generate a list of levels based on the book.

            `}
            onGen={setLevels}
            render={(levels:Level[])=>{
                const level=levels[levelIndex];
                if(!level){
                    return null;
                }
                return (
                    <View col flex1 posRel zIsolate>
                        <GenImg prompt={level.visualDescription} flex1 absFill zIndexNeg1/>
                        <View row alignCenter justifyBetween className={style.levelTitle()} >
                            <Text xl text={level.name}/>
                            <span>level {levelIndex+1} of {levels.length}</span>
                        </View>
                        <View col posRel flex1>
                            <ScrollView containerFill containerCol flex1 opacity0={end} transOpacity>
                                <View row flexWrap g1 p1 justifyCenter>
                                    <Gen
                                        key={levelIndex}
                                        cache
                                        vars={{level,userInstructions}}
                                        convo={/*convo*/`
                                            @json Creature[]
                                            > user
                                            Generate 3 to 4 creatures for the following level

                                            <level>
                                            {{level}}
                                            </level>
                                        `}
                                        onGen={setLevelCreatures}
                                        forEach={(creature:Creature)=>(
                                            <CreatureCard
                                                creature={creature}
                                                selectText={selectedAttack?'Attack':undefined}
                                                onSelect={attackCreature}
                                                hp={hpMap[getCreatureKey(levelIndex,creature)]}
                                                selected={creature.name===selectedCreature?.name}
                                                selectedAttack={creature.name===selectedCreature?.name?
                                                    (selectedCreatureAttack??undefined):undefined
                                                }
                                            />
                                        )}
                                    />
                                </View>
                            </ScrollView>
                            {end && <View absFill transOpacity pointerEventsNone={!end} opacity0={!end} centerBoth>
                                <div className={style.messageCard()}>
                                    {screen==='win'?
                                        'You won 🥳'
                                    :screen==='lose'?
                                        'You lost 😢'
                                    :
                                        null
                                    }
                                </div>
                            </View>}
                        </View>

                        <View row className={style.playerBar()}>
                            <Gen
                                cache
                                vars={{userInstructions}}
                                convo={/*convo*/`
                                    @json Creature
                                    > user
                                    Generate a creature for that the player will use to battle other creatures with.
                                    Give the creature a friendly pet name.
                                `}
                                onGen={setPlayerCreature}
                                render={()=>!playerCreature?null:(
                                    <View row g1 flex1>
                                        <View col g050>
                                            <View col g050>
                                                <span>{playerCreature.name}</span>
                                            </View>
                                            <GenImg prompt={playerCreature.visualDescription} className={style.smImg()}/>
                                        </View>
                                        <View flex1 row g1>
                                        {playerCreature.attacks.map((attack,i)=>(
                                            <View
                                                key={i}
                                                col
                                                g050
                                                p050
                                                className={style.playerAttack()}
                                                opacity050={usedAttacks.some(a=>a.name===attack.name)}
                                            >
                                                <SlimButton
                                                    disabled={locked || usedAttacks.some(a=>a.name===attack.name) || end}
                                                    opacity050={locked || usedAttacks.some(a=>a.name===attack.name) || end}
                                                    className={style.btn()}
                                                    onClick={()=>setSelectedAttack(attack===selectedAttack?null:attack)}
                                                >
                                                    {selectedAttack===attack?'Cancel':'Use attack'}
                                                </SlimButton>
                                                <View row justifyBetween>
                                                    <span>{attack.name}</span>
                                                    <span>{attack.power}</span>
                                                </View>
                                                <Text sm opacity075 text={attack.description}/>
                                            </View>
                                        ))}
                                        </View>

                                        <Text xl text={`${playerCreature.hp}HP`}/>
                                    </View>
                                )}
                        />
                        </View>
                    </View>
                )
            }}
        />
        </GenMetadata>
    </div>);
}

interface CreatureCardProps
{
    creature:Creature;
    selectText?:string;
    onSelect?:(creature:Creature)=>void;
    hp?:number;
    selected?:boolean;
    selectedAttack?:Attack;
}

function CreatureCard({
    creature,
    selectText,
    onSelect,
    hp=creature.hp,
    selected,
    selectedAttack
}:CreatureCardProps){
    const dead=!hp;
    return (
        <div className={style.creatureCard({dead,selected})}>
            <View row justifyBetween g1>
                <span>{creature.name}</span>
                <span>{hp}HP</span>
            </View>
            <GenImg sq prompt={creature.visualDescription}/>
            <Text weightBold text="Attacks" />
            {creature.attacks.map((attack,i)=>(
                <View key={i} col g050 p050 className={style.attack({selected:selectedAttack?.name===attack.name})}>
                    <View row justifyBetween>
                        <span>{attack.name}</span>
                        <span>{attack.power}</span>
                    </View>
                    <Text sm opacity075 text={attack.description}/>
                </View>
            ))}
            {!!selectText && !dead && <View centerBoth absFill className={style.selectOverlay()}>
                <SlimButton onClick={()=>onSelect?.(creature)} className={style.btn()}>{selectText}</SlimButton>
            </View>}
        </div>
    )
}

const getCreatureKey=(levelIndex:number,creature:Creature)=>{
    return `${levelIndex}:${creature.name}`;
}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'PdfAdventure',css:`

    @.root{
        display:flex;
        flex-direction:column;
        flex:1;
        border:1px solid #fff;
        border-radius:1rem;
        overflow:hidden;
    }
    @.levelTitle{
        padding:1rem;
        background:@@containerBg;
        border-bottom:1px solid #fff;
    }
    @.playerBar{
        padding:0.5rem;
        background:@@containerBg;
        border-top:1px solid #fff;
    }
    @.creatureCard{
        display:flex;
        flex-direction:column;
        width:350px;
        max-width:90vw;
        background:@@containerBg;
        border-radius:0.5rem;
        gap:0.5rem;
        padding:0.5rem;
        border:1px solid #fff;
        position:relative;
        overflow:hidden;
        outline:0px solid #358FF6;
        transition:transform 0.5s ease-in-out, opacity 0.5s ease-in-out, outline-width 0.1s ease-in-out;
    }
    @.creatureCard.dead{
        opacity:0.8;
        transform:scale(0.8);
    }
    @.creatureCard.selected{
        outline:6px solid #358FF6;
    }
    @.attack.selected{
        color:#358FF6;
    }
    @.btn{
        padding:0.4rem 0.8rem;
        background:@@containerBg;
        border:1px solid #fff;
        background-color:#144866c2;
        border-radius:0.5rem;
        display:flex;
        justify-content:center;
        letter-spacing:0.03em;
        font-weight:600;
    }
    @.smImg{
        width:130px;
        height:130px;
        border:1px solid #fff;
    }
    @.playerAttack{
        flex:1;
        max-width:250px;
    }
    @.selectOverlay{
        background:#00000044;
    }
    @.messageCard{
        display:flex;
        flex-direction:column;
        padding:2rem;
        background:@@containerBg;
        border:1px solid #fff;
        font-size:2rem;
        border-radius:1rem;
    }
    @.card{
        display:flex;
        flex-direction:column;
        padding:1rem;
        background:@@containerBg;
        border:1px solid #fff;
        border-radius:1rem;
        gap:1rem;
        min-width:350px;
        max-width:80vw;
    }
    @.textArea{
        min-height:100px;
        border-radius:0.5rem;
        padding:0.5rem;
        border:1px solid #444;
    }
    @.textInput{
        border-radius:0.5rem;
        padding:0.5rem;
        border:1px solid #444;
    }

`});


interface Attack{
    name: string
    description: string
    power:number
}

interface Creature{
    name:string
    visualDescription:string
    hp:number
    attacks:Attack[]
}

interface Level{
    name:string
    visualDescription:string
    creatures?:Creature[]
}
