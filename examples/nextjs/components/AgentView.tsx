import { ConversationView } from "@convo-lang/convo-lang-react";
import { atDotCss } from "@iyio/at-dot-css";

export interface AgentViewProps
{
    /**
     * The default Convo-Lang script that will be loaded in the chat window
     */
    convoScript:string;

    /**
     * Functions for the LLM to call. The functions must be defined in the `convoScript` prop
     * as extern functions to be called directly by the LLM.
     */
    externFunctions?:Record<string,(...params: any[])=>any>;

    /**
     * Variables that will be passed to the Convo-Lang script
     */
    defaultVars?:Record<string,any>;

    /**
     * Children will be display to the left of the chat window in the main content area.
     */
    children?:any;
}

/**
 * Displays a split view with a chat window on the right and main content area to the left.
 * The children of the AgentView populate the content area.
 */
export function AgentView({
    convoScript,
    externFunctions,
    children,
    defaultVars
}:AgentViewProps){

    return (
        <div className={style.root()}>

            <div className={style.contentArea()}>
                {children}
            </div>

            <div className={style.chat()}>
                <ConversationView
                    theme="dark"
                    showInputWithSource
                    enabledSlashCommands
                    template={globalThis.window/*only render convo on client side*/?convoScript:undefined}
                    httpEndpoint="/api/convo-lang"
                    externFunctions={externFunctions}
                    defaultVars={defaultVars}
                />
            </div>

        </div>
    )

}


// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'AgentView',css:`
    @.root{
        display:flex;
        flex:1;
        border-radius:8px;
        gap:1rem;
    }

    @.contentArea{
        flex:1;
        position:relative;
        display:flex;
        flex-direction:column;
        overflow:hidden;
        border-radius:8px;
        border:1px solid #444;
        background-color:#1E1E1E;
    }
    
    @.chat{
        display:flex;
        flex-direction:column;
        width:500px;
        background-color:#222;
        border-radius:8px;
        border:1px solid #444;
    }
`});
