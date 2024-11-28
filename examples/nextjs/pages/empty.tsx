import { atDotCss } from "@iyio/at-dot-css";
import { AgentView } from "../components/AgentView";

// For syntax highlighting of Convo-Lang install the Convo-Lang VSCode extension.
// Search for "convo-lang" in the extensions window.
const convoScript=/*convo*/`

`;

export default function Empty(){

    return (
        <AgentView
            convoScript={convoScript}
            externFunctions={{}}
            defaultVars={{}}
        >



        </AgentView>
    );
}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'Empty',css:`


`});
