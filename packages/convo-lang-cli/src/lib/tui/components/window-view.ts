import { WindowCtrl } from "@convo-lang/studio/WindowCtrl";
import { SpriteDef, SpriteGridColWidth, SpriteGridRowHeight } from "@convo-lang/tui/tui-types";
import { ConvoCliTuiCtx } from "../lib/convo-cli-tui-types";
import { cellView } from "./cell-view";
import { landingView } from "./landing-view";

export const windowView=(ctx:ConvoCliTuiCtx,window:WindowCtrl=ctx.window):SpriteDef=>{
    const getChildren=():SpriteDef[]=>{
        if(!window.cells.length){
            return [landingView(ctx)];
        }
        return window.cells.map(c=>{

            return cellView(ctx,c);
        })
    }

    const sub=window.cellsSubject.subscribe(()=>{
        ctx.tui.updateSprite({
            id:window.id,
            children:getChildren(),
        })
    });

    const getGridLayout=():Partial<SpriteDef>=>{
        return {
            gridCols:(window.obj.columns??[1]).map(n=>`${n}fr` satisfies SpriteGridColWidth),
            gridRows:(window.obj.rows??[1]).map(n=>`${n}fr` satisfies SpriteGridRowHeight),
        }
    }

    return {
        id:window.id,
        layout:'grid',
        ...getGridLayout(),
        children:getChildren(),
        flex:1,
        onUnmount:()=>{
            sub.unsubscribe();
        },
    }
}