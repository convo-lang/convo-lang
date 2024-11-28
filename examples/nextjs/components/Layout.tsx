import { atDotCss } from "@iyio/at-dot-css";
import { UiActionItem } from "@iyio/common";
import { NextJsBaseLayoutView } from "@iyio/nextjs-common";
import { SlimButton, View } from "@iyio/react-common";
import { Icon, IconType } from "./icon/Icon";

const links:UiActionItem[]=[
    {
        title:'About',
        to:'/'
    },
    {
        title:'Fitness Trainer',
        to:'/fitness-trainer'
    },
    {
        title:'Retro Web Design',
        to:'/retro-web'
    },
    {
        title:'My Room',
        to:'/my-room'
    },
    {
        title:'Cafe',
        to:'/cafe'
    },
    {
        title:'Solar System',
        to:'/solar-system'
    },
    {
        title:'PDF Adventure',
        to:'/pdf-adventure'
    },

]

const socialLinks:UiActionItem<IconType>[]=[
    {
        icon:'npm',
        to:'https://www.npmjs.com/package/@convo-lang/convo-lang',
    },
    {
        icon:'github',
        to:'https://github.com/convo-lang/convo-lang',
    },

]

export interface LayoutProps
{
    children:any;
}

export function Layout({
    children
}:LayoutProps){

    return (
        <NextJsBaseLayoutView className={style.root()}>

            <View row alignCenter justifyBetween>

                <View row g2 alignCenter>
                    <img className={style.icon()} alt="Convo-Lang" src="/logo-icon.png"/>
                    {links.map((l,i)=>(
                        <SlimButton actionItem={l} key={i} className={style.link()}>
                            {l.title}
                        </SlimButton>
                    ))}
                </View>

                <View row alignCenter g2>
                    {socialLinks.map((l,i)=>(
                        <SlimButton key={i} openLinkInNewWindow actionItem={l}>
                            <Icon size={24} icon={l.icon??'default'}/>
                        </SlimButton>
                    ))}
                </View>
            </View>

            <div className={style.page()}>
                {children}
            </div>

        </NextJsBaseLayoutView>
    )

}

// For syntax highlighting of at-dot-css install the "high-js" VSCode extension.
const style=atDotCss({name:'Layout',css:`
    @.root{
        display:flex;
        flex-direction:column;
        width:100%;
        height:100%;
        padding:1rem;
        gap:1rem;
    }
    @.icon{
        height:2rem;
        margin-right:-0.5rem;
    }
    @.convoLink{
        font-family:Staatliches;
        text-transform:uppercase;
        font-size:1.5rem;
        letter-spacing:0.06em;
    }
    @.link{
        color:#ccc;
        letter-spacing:0.03em;
    }
    @.page{
        display:flex;
        flex-direction:column;
        flex:1;
        position:relative;
    }

    :root {
        --background: #0a0a0a;
        --foreground: #ededed;
    }

    html {
        color-scheme: dark;
    }

    html,
    body,
    #__next{
        width:100%;
        height:100%;
        overflow:hidden;
    }

    body{
        color: var(--foreground);
        background: var(--background);
        font-family: Arial, Helvetica, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    *{
        box-sizing: border-box;
        padding: 0;
        margin: 0;
    }

    a{
        color: inherit;
        text-decoration: none;
    }

`});
