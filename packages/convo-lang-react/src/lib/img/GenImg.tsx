import { useGenMetadata } from "@convo-lang/convo-lang-react";
import { atDotCss } from "@iyio/at-dot-css";
import { BaseLayoutProps, currentBaseUser, getErrorMessage, httpClient } from "@iyio/common";
import { LoadingDots, Text, View } from "@iyio/react-common";
import { useEffect, useState } from "react";
import { getGenImgUrl } from "./gen-img-lib";

export interface GenImgProps
{
    salt?:string;
    prompt?:string;
    src?:string
    metadata?:Record<string,any>;
    artStyle?:string;
    children?:any;
    aspectRatio?:number|string;
    sq?:boolean;
    landscape?:boolean;
    portrait?:boolean;
    perUser?:boolean;
    flatBottom?:boolean;
    flatTop?:boolean;
    flatLeft?:boolean;
    flatRight?:boolean;
    maxPromptLength?:number;
    borderRadius?:string;
    loadingBackground?:string;
    loadingBorder?:string;
    genEndpoint?:string;
    disableCaching?:boolean;
    onBlob?:(blob:Blob|null)=>void;
}

/**
 * Displays an AI generated image based on a prompt
 */
export function GenImg({
    /**
     * If true each user will have a different version of the image generated.
     */
    perUser,
    salt=perUser?(currentBaseUser.get()?.email??'no-user'):'default',
    /**
     * The prompt used to generate the image
     */
    prompt,
    sq,
    landscape,
    portrait,
    src:srcProp,
    aspectRatio=landscape?'16/9':portrait?'9/16':sq?1:undefined,
    children,
    flatBottom,
    flatTop,
    flatLeft,
    flatRight,
    metadata,
    artStyle,
    maxPromptLength=800,
    borderRadius='0.5rem',
    loadingBackground='#77777777',
    loadingBorder='1px solid #777777',
    genEndpoint='/api/convo-lang/image',
    disableCaching,
    onBlob,
    ...props
}:GenImgProps & BaseLayoutProps){

    const [loaded,setLoaded]=useState(false);
    const [srcUrl,setSrcUrl]=useState('');
    const [error,setError]=useState('');
    const [blob,setBlob]=useState<Blob|null>(null);
    useEffect(()=>{
        if(onBlob){
            onBlob(blob);
        }
    },[blob,onBlob]);

    const genMetadata=useGenMetadata();

    const url=prompt?getGenImgUrl({
        prompt,
        salt,
        metadata:genMetadata,
        maxPromptLength,
        artStyle,
        genEndpoint,
        disableCaching,

    }):undefined;

    const src=srcProp||srcUrl||url;

    useEffect(()=>{
        setLoaded(false);
        setError('');
        setBlob(null);
        if(!url){
            return;
        }
        let m=true;
        let blobUrl:string|undefined;
        httpClient().getResponseAsync(url).then(async (r)=>{
            if(!m){
                return;
            }
            if(r?.redirected){
                setSrcUrl(r.url);
                setLoaded(true);
            }else if(r?.ok){
                try{
                    const blob=await r.blob();
                    if(!m){
                        return;
                    }
                    blobUrl=URL.createObjectURL(blob);
                    setSrcUrl(blobUrl);
                    setLoaded(true);
                    setBlob(blob);
                }catch(err){
                    console.error('Image load failed',err);
                    setError(getErrorMessage(err));
                }
            }
        }).catch((err:any)=>{
            console.error('Image load failed',err);
            setError(getErrorMessage(err));
        })
        return ()=>{
            m=false;
            if(blobUrl){
                URL.revokeObjectURL(blobUrl);
            }
        }
    },[url]);

    return (
        <div
            className={style.root({
                loading:!loaded,
                flatBottom,
                flatTop,
                flatLeft,
                flatRight,
            },null,props)}
            style={{
                backgroundImage:(prompt && loaded)?`url("${src}")`:undefined,
                aspectRatio,
                backgroundSize:'cover',
                ...style.vars({borderRadius,loadingBackground,loadingBorder})
            }}
            title={prompt}
            aria-description={prompt}
            data-gen-url={url}
        >

            {children}
            {!!error && <View absFill centerBoth>
                <Text text={error} colorDanger/>
            </View>}
            {!loaded && <LoadingDots absCenter />}

        </div>
    )

}

const style=atDotCss({name:'GenImg',order:'framework',css:`
    @.root{
        position:relative;
        border-radius:@@borderRadius;
    }
    @.root.loading{
        background-color:@@loadingBackground;
        border:@@loadingBorder;
    }
    @.root.flatBottom{
        border-bottom-left-radius:0;
        border-bottom-right-radius:0;
    }
    @.root.flatTop{
        border-top-left-radius:0;
        border-top-right-radius:0;
    }
    @.root.flatLeft{
        border-top-left-radius:0;
        border-bottom-left-radius:0;
    }
    @.root.flatRight{
        border-top-right-radius:0;
        border-bottom-right-radius:0;
    }
`});

export const renderGenImg=(props:GenImgProps & BaseLayoutProps)=><GenImg {...props}/>
