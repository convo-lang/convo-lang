import { LoadingDotsProps } from "@iyio/react-common";

export interface ConvoLangTheme
{
    foregroundColor:string;
    inputBackground:string;
    inputPadding:string;
    inputMargin:string;
    inputShadow:string;
    inputBorder:string;
    buttonColor:string;
    buttonForeground:string;
    borderRadius:string;
    padding:string;
    gap:string;
    borderColor:string;

    userBackground:string;
    userColor:string;
    userBorder:string;
    userWeight:string;
    agentBackground:string;
    agentColor:string;
    agentWeight:string;
    agentBorder:string;
    messageBorderRadius:string;
    messagePadding:string;
    maxMessageWidth:string;
    fontSize:string;
    loaderProps?:LoadingDotsProps;
    wrapLoader?:boolean;

    messageRowClassName?:string;
    messageRowUnstyled?:boolean;
    rowWidth?:string;

    suggestionBackgroundColor:string;
    suggestionColor:string;
    suggestionWeight:string;
    suggestionBorder:string;
    suggestionDivider:string;

}

export const defaultLightConvoLangTheme:ConvoLangTheme={
    foregroundColor:'#111111',
    inputBackground:'#ffffff',
    inputPadding:'0.5rem',
    inputMargin:'0 0.5rem 0.5rem 0.5rem',
    inputShadow:'none',
    inputBorder:'none',
    borderRadius:'0.5rem',
    buttonColor:'#cccccc',
    buttonForeground:'#111111',
    borderColor:'#333333',
    padding:'1rem',
    gap:'1rem',
    fontSize:'1rem',
    userBackground:'#4F92F7',
    userColor:'inherit',
    userBorder:'none',
    userWeight:'inherit',
    agentBackground:'#3B3B3D',
    agentColor:'inherit',
    agentWeight:'inherit',
    agentBorder:'none',
    maxMessageWidth:'700px',
    messageBorderRadius:'1.2rem',
    messagePadding:'10px 14px',
    suggestionBackgroundColor:'#ffffff',
    suggestionColor:'#111111',
    suggestionWeight:'500',
    suggestionBorder:'none',
    suggestionDivider:'#00000055'
} as const

export const defaultDarkConvoLangTheme:ConvoLangTheme={
    ...defaultLightConvoLangTheme,
    foregroundColor:'#ffffff',
    inputBackground:'#333333',
    borderColor:'#999999',
    inputShadow:'0 0 20px 0px #ffffff11',
    inputBorder:'1px solid #ffffff22',
    buttonColor:'#333333',
    buttonForeground:'#ffffff',
    agentBorder:'1px solid rgba(255, 255, 255, 0.11)',
    suggestionBorder:'1px solid rgba(255, 255, 255, 0.11)',
    suggestionBackgroundColor:'#000000',
    suggestionColor:'#ffffff',
    suggestionDivider:'1px solid #ffffff55'
} as const
