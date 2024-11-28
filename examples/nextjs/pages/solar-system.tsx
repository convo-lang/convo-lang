import { Gen, GenImg, MarkdownViewer } from "@convo-lang/convo-lang-react";
import { atDotCss } from "@iyio/at-dot-css";
import { ScrollView } from "@iyio/react-common";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const convoScript=/*convo*/`

`;

export default function SolarSystem(){

    return (
        <ScrollView flex1>
            <div className={style.root()}>
                <h1>Solar System</h1>
                <Gen
                    cache
                    convo={/*convo*/`

                        > define
                        Planet = struct(
                            name: string
                            visualDescription: string
                            moonCount: number
                            # The average distance from the sun in miles
                            distanceFromSun: number
                            # a few fun facts about the plant in markdown format
                            funFacts: string
                        )

                        @json Planet[]
                        > user
                        Generate a list planets in our solar system.

                    `}
                    forEach={planet=>(
                        <div className={style.row()}>
                            <div className={style.col()}>
                                <h2>{planet.name}</h2>
                                <MarkdownViewer markdown={planet.funFacts}/>
                                <p>Moons: {planet.moonCount}</p>
                                <p>Distance from sun: {planet.distanceFromSun.toLocaleString()} miles</p>
                            </div>
                            <GenImg flex1 prompt={planet.visualDescription} sq artStyle="modern art" />
                        </div>
                    )}
                />
            </div>
        </ScrollView>
    );
}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'SolarSystem',css:`

    @.root{
        display:flex;
        flex-direction:column;
        gap:2rem;
        max-width:900px;
        margin:0 auto;
        padding:0 1rem;
    }

    @.row{
        display:flex;
        gap:1rem;
    }

    @.col{
        display:flex;
        flex-direction:column;
        gap:1rem;
        flex:1;
    }

`});
