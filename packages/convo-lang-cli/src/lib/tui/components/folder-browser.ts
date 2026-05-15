import { ConvoDbFsItem } from "@convo-lang/convo-lang";
import { SpriteDef } from "@convo-lang/tui/tui-types";
import { getDirectoryName, joinPaths } from "@iyio/common";
import { FSWatcher, watch } from "fs";
import { cIcon } from "../lib/character-icons";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";

export const fileBrowser=(ctx:ConvoCliTuiCtx):SpriteDef=>{

    const {tui,studio}=ctx;

    let dir=studio.cwd;
    const setDir=(d:string)=>{
        let w=studio.workspacePath;
        if(!w.endsWith('/')){
            w+='/';
        }
        if(d.startsWith('/') && d.startsWith(w)){
            d='./'+d.substring(w.length);
        }
        dir=d;
        ctx.studio.cwd=d;
    }

    const listId=tui.getNextId('directory-listing');

    let fileSprites:SpriteDef[]=[];
    let watcher:FSWatcher|undefined;
    let currentWatchDir='';

    const cleanUpWatcher=()=>{
        watcher?.close();
        watcher=undefined;
        currentWatchDir='';
    }

    const updateWatcher=(id:number,dir:string)=>{
        if(currentWatchDir===dir){
            return;
        }
        cleanUpWatcher();
        currentWatchDir=dir;
        watcher=watch(joinPaths(studio.workspacePath,dir),{recursive:false,persistent:false},(evt,name)=>{
            if(name==='log'){
                return;
            }
            updateFilesAsync();
        });
    }

    let updateId=0;
    const updateFilesAsync=async ()=>{
        try{
            const id=++updateId;
            let path=dir;
            if(path.endsWith('/.')){
                path=path.substring(0,path.length-2)
            }
            if(path.startsWith('./')){
                path=path.substring(2);
            }
            if(!path || path==='.'){
                path='/'
            }
            const r=await studio.db.getNodeByPathAsync(path);
            if(!r.success){
                throw new Error(r.error);
            }
            const items=Object.values(r.result?.data??{}) as Partial<ConvoDbFsItem>[];
            if(id!==updateId){
                return;
            }
            items.sort((a,b)=>`${a.isDir?'1':'2'}${a.name}`.localeCompare(`${b.isDir?'1':'2'}${b.name}`));


            fileSprites=items.map(item=>{
                return {
                    text:`${item.isDir?'⏵':' '} ${item.name}`,
                    textWrap:'clip',
                    isButton:true,
                    activeColor:'foreground',
                    onClick:()=>{
                        if(item.isFile && item.path){
                            studio.openDocAsync(item.path,true)
                        }else if(item.path){
                            setDir(item.path);
                            updateFilesAsync();
                        }
                    }
                }
            });
            if(dir==='.'){
                fileSprites.unshift({
                    text:`${cIcon.dotLg} /`,
                    textWrap:'clip',
                    margin:{bottom:1},
                })
            }else{
                fileSprites.unshift({
                    text:`${cIcon.dotDot} ${dir}`,
                    margin:{bottom:1},
                    textWrap:'clip',  
                    onClick:()=>{
                        setDir(getDirectoryName(dir)||'.');
                        updateFilesAsync();
                    }
                })
            }
            updateWatcher(id,dir);
            tui.updateSprite({
                id:listId,
                children:fileSprites,
            })
        }catch(ex){
            console.error(ex);
        }
    }

    const dirSub=ctx.studio.cwdSubject.subscribe(v=>{
        if(v===dir){
            return;
        }
        dir=v;
        updateFilesAsync();
    })

    return {
        id:listId,
        text:'File Browser',
        layout:'column',
        flex:1,
        scrollable:true,
        children:fileSprites,
        onMount:updateFilesAsync,
        onUnmount:()=>{
            cleanUpWatcher();
            dirSub.unsubscribe();
        },
    }
}