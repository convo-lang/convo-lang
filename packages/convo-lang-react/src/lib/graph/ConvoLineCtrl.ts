import { ConvoEdge } from "@convo-lang/convo-lang";
import { atDotCss } from "@iyio/at-dot-css";
import { Point, ReadonlySubject, Rect, getDistanceBetweenPoints, wAryRemoveAt, wArySplice, wSetProp } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";
import { ConvoUiLine } from "./convo-graph-react-type";

const plusSize=22;
const plusSizeHalf=plusSize/2;

export class ConvoLineCtrl
{

    private readonly parent:ConvoGraphViewCtrl;
    private lineUpdateId=0;
    private readonly lines:ConvoUiLine[]=[];

    private _lineGroup:SVGGElement|null=null;
    public get lineGroup(){return this._lineGroup}
    public set lineGroup(value:SVGGElement|null){
        if(this._lineGroup===value){return}
        this._lineGroup=value;
        if(value){
            value.innerHTML='';
        }
        this.updateLines();
    }

    private readonly _lineDistances:BehaviorSubject<ProtoUiLengthStyle>=new BehaviorSubject<ProtoUiLengthStyle>({
        min:1000,
        max:3000,
        minOpacity:0.4,
    });
    public get lineDistancesSubject():ReadonlySubject<ProtoUiLengthStyle>{return this._lineDistances}
    public get lineDistances(){return this._lineDistances.value}
    public set lineDistances(value:ProtoUiLengthStyle){
        if(value==this._lineDistances.value){
            return;
        }
        this._lineDistances.next(value);
        this.updateLines();
    }

    public constructor(parent:ConvoGraphViewCtrl)
    {
        this.parent=parent;
    }

    private getLine(excludeUpdateId:number,fromAddress:string,toAddress:string,isTo:boolean,ptIndex:number|undefined):ConvoUiLine|null{
        for(const line of this.lines){
            if( line.updateId!==excludeUpdateId &&
                line.fromAddress===fromAddress &&
                line.toAddress===toAddress &&
                line.isTo===isTo &&
                line.ptIndex===ptIndex
            ){
                return line;
            }
        }
        return null;
    }

    private insertLineElements(line:ConvoUiLine){
        line.elem.remove();
        line.elem2.remove();
        line.centerElem.remove();
        line.ptElem?.remove();
        this._lineGroup?.insertBefore(line.hoverElem,this._lineGroup.firstChild);
        this._lineGroup?.insertBefore(line.elem,line.hoverElem);
        this._lineGroup?.insertBefore(line.elem2,line.elem);
        this._lineGroup?.appendChild(line.centerElem);
        if(line.ptElem){
        this._lineGroup?.appendChild(line.ptElem);
        }
    }

    public updateLines(onlyForAddress?:string)
    {
        const updateId=++this.lineUpdateId;

        const overlaps:Record<string,LinePt[]>={};
        const lines:ConvoUiLine[]=[];

        const updateEdge=onlyForAddress?this.getEdge(onlyForAddress):undefined;


        const drawLine=(edge:ConvoEdge,isTo:boolean,ptIndex?:number)=>{


            if(!edge){
                return;
            }

            const fromId=isTo?edge.id:edge.from;
            const toId=isTo?edge.to:edge.id;

            const end=this.parent.entityCtrls[toId];
            const start=this.parent.entityCtrls[fromId];
            if(!end || !start){
                return;
            }


            let line=this.getLine(updateId,fromId,toId,isTo,ptIndex);

            const lineColor=getLinkColor(line??undefined);

            if(!line){
                line={
                    edge,
                    fromAddress:fromId,
                    toAddress:toId,
                    updateId,
                    isTo,
                    elem:document.createElementNS("http://www.w3.org/2000/svg","path"),
                    elem2:document.createElementNS("http://www.w3.org/2000/svg","path"),
                    hoverElem:document.createElementNS("http://www.w3.org/2000/svg","path"),
                    centerElem:document.createElementNS("http://www.w3.org/2000/svg","g"),
                    centerBorderElem:document.createElementNS("http://www.w3.org/2000/svg","circle"),
                    plusElem:document.createElementNS("http://www.w3.org/2000/svg","path"),
                    p1:{x:0,y:0},
                    p2:{x:0,y:0},
                    color:lineColor,
                    dir:0,
                    dir1:1,
                    dir2:1,
                    center:{x:0,y:0}
                }
                line.elem.setAttribute('stroke',lineColor);
                line.elem.setAttribute('fill','none');
                line.elem.setAttribute('stroke-width','2');
                line.elem.style.pointerEvents='none';

                line.elem2.setAttribute('stroke','#0C0C0C');
                line.elem2.setAttribute('stroke-width','6');
                line.elem2.setAttribute('fill','none');
                line.elem2.style.pointerEvents='none';

                line.hoverElem.setAttribute('stroke','#00000000');
                line.hoverElem.setAttribute('stroke-width',plusSize.toString());
                line.hoverElem.setAttribute('fill','none');
                line.hoverElem.addEventListener('mouseover',this.onLineOver);
                line.hoverElem.addEventListener('mouseout',this.onLineOut);
                (line.hoverElem as any)[convoElemLineRef]=line;

                line.centerElem.classList.add(convoLineCtrlStyle.centerPt());

                line.centerBorderElem.setAttribute('stroke',lineColor);
                line.centerBorderElem.setAttribute('stroke-width','2');
                line.centerBorderElem.setAttribute('fill','#0C0C0C');
                line.centerBorderElem.setAttribute('r',(plusSizeHalf).toString());
                line.centerBorderElem.addEventListener('click',this.onPlusClick);
                (line.centerBorderElem as any)[convoElemLineRef]=line;

                line.plusElem.setAttribute('stroke',lineColor);
                line.plusElem.setAttribute('fill','none');
                line.plusElem.setAttribute('stroke-width','2');
                line.plusElem.style.pointerEvents='none';

                line.centerElem.append(line.centerBorderElem);
                line.centerElem.append(line.plusElem);

                if(ptIndex!==undefined){
                    const pt=(isTo?edge.toPoints:edge.fromPoints)?.[ptIndex];
                    if(!pt){
                        return;
                    }
                    line.ptIndex=ptIndex;
                    line.ptElem=document.createElementNS("http://www.w3.org/2000/svg","g");
                    line.ptBorderElem=document.createElementNS("http://www.w3.org/2000/svg","circle");
                    line.ptElem.append(line.ptBorderElem);
                    line.ptBorderElem.setAttribute('stroke',lineColor);
                    line.ptBorderElem.setAttribute('stroke-width','2');
                    line.ptBorderElem.setAttribute('fill','#0C0C0C');
                    line.ptBorderElem.setAttribute('r',(plusSizeHalf).toString());
                    line.ptBorderElem.classList.add(convoLineCtrlStyle.midPt());
                    line.ptBorderElem.addEventListener('contextmenu',this.onMidContextMenu);
                    (line.ptBorderElem as any)[convoElemLineRef]=line;
                }

                this.lines.push(line);
                this.insertLineElements(line);
            }

            // if(priority!==line.priority){
            //     line.priority=priority;
            //     this.insertLineElements(line);
            // }

            if(onlyForAddress!==undefined && !this.isConnectedTo(line,onlyForAddress,updateEdge)){
                line.updateId=updateId;
                return;
            }

            let dist=Number.MAX_SAFE_INTEGER;

            let dir1:1|-1=1;
            let dir2:1|-1=1;


            delete line.fromMid;
            delete line.toMid;

            let startBounds=start.getElementBounds({type:'shell'});
            let endBounds=end.getElementBounds({type:'shell'});

            if(!startBounds || !endBounds){
                return;
            }

            // check for mid points here
            // mid points are draw moving from the "from" node to the "to" node
            if(ptIndex===undefined){
                const pt=(isTo?edge.toPoints:edge.fromPoints)?.[0];
                if(pt){
                    endBounds=ptToBounds(pt);
                    line.toMid=true;
                }
            }else{
                const pts=(isTo?edge.toPoints:edge.fromPoints);
                if(!pts){
                    return;
                }
                const pt=pts[ptIndex];
                if(!pt){
                    return;
                }
                line.ptPt=pt;
                startBounds=ptToBounds(pt);

                const nextPt=pts[ptIndex+1];
                if(nextPt){
                    endBounds=ptToBounds(nextPt);
                    line.toMid=true;
                }

                if(ptIndex){
                    line.fromMid=true;
                }
            }



            let startPt:Point={x:startBounds.x,y:startBounds.y+startBounds.height/2};
            let endPt:Point={x:endBounds.x,y:endBounds.y+endBounds.height/2};
            let checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=-1;
                dir2=-1;
            }

            startPt={x:startBounds.x+startBounds.width,y:startBounds.y+startBounds.height/2};
            endPt={x:endBounds.x,y:endBounds.y+endBounds.height/2};
            checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=1;
                dir2=-1;
            }

            startPt={x:startBounds.x,y:startBounds.y+startBounds.height/2};
            endPt={x:endBounds.x+endBounds.width,y:endBounds.y+endBounds.height/2};
            checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=-1;
                dir2=1;
            }

            startPt={x:startBounds.x,y:startBounds.y+startBounds.height/2};
            endPt={x:endBounds.x,y:endBounds.y+endBounds.height/2};
            checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=1;
                dir2=1;
            }

            const keyRes=3;
            let key:string;
            let ary:LinePt[];


            if(!line.fromMid){
                key=`${Math.floor(line.p1.x/keyRes)}:${Math.floor(line.p1.y/keyRes)}`;
                ary=overlaps[key]??(overlaps[key]=[]);
                ary.push({from:{...line.p2},target:line.p1});
            }

            if(!line.toMid){
                key=`${Math.floor(line.p2.x/keyRes)}:${Math.floor(line.p2.y/keyRes)}`;
                ary=overlaps[key]??(overlaps[key]=[]);
                ary.push({from:{...line.p1},target:line.p2});
            }



            const distOpacity=getDistanceOpacity(dist,this.lineDistances);
            line.elem.setAttribute('opacity',distOpacity.toString());
            line.elem2.setAttribute('opacity',distOpacity.toString());

            line.updateId=updateId;
            const dir=(
                start.entity &&
                end.entity &&
                toId===fromId?
                30:Math.min(dist/2,Math.min(300,Math.max(60,Math.abs(line.p1.x-line.p2.x)*0.7)))
            );
            line.dir=dir;
            line.dir1=dir1;
            line.dir2=dir2;
            lines.push(line);
        }

        for(const edge of this.parent.graph.edges){
            drawLine(edge,false);
            drawLine(edge,true);
            if(edge.toPoints){
                for(let i=0;i<edge.toPoints.length;i++){
                    drawLine(edge,true,i);
                }
            }
            if(edge.fromPoints){
                for(let i=0;i<edge.fromPoints.length;i++){
                    drawLine(edge,false,i);
                }
            }
        }

        //console.info('line update count',lines.length);

        for(const key in overlaps){

            const group=overlaps[key];
            if(!group || group.length<2){
                continue;
            }

            group.sort((a,b)=>a.from.y-b.from.y);

            const gap=20;
            const offset=group.length*gap/2;
            let y=(group[0] as LinePt).target.y-offset;
            for(let i=0;i<group.length;i++){
                const line=group[i];
                if(!line){continue}

                line.target.y=y;
                y+=gap;

            }


        }

        for(let i=0;i<lines.length;i++){
            const line=lines[i];
            if(!line){continue}

            const toLeft=line.dir2===-1;
            const lineColor=getLinkColor(line??undefined);


            const aSize=7;
            const aOffset=3*(toLeft?-1:1);
            const d=(
                `M ${Math.round(line.p1.x)} ${Math.round(line.p1.y)
                } C ${Math.round(line.p1.x+(line.dir*line.dir1))} ${Math.round(line.p1.y)
                } ${Math.round(line.p2.x+(line.dir*line.dir2))} ${Math.round(line.p2.y)
                }  ${Math.round(line.p2.x)} ${Math.round(line.p2.y)}`
            )
            const arrow=(
                ` M ${Math.round(line.p2.x+(toLeft?-aSize:aSize)+aOffset)} ${Math.round(line.p2.y+aSize)
                } L ${Math.round(line.p2.x+aOffset)} ${Math.round(line.p2.y)
                } L ${Math.round(line.p2.x+(toLeft?-aSize:aSize)+aOffset)} ${Math.round(line.p2.y-aSize)}`
            )
            line.elem.setAttribute('d',d+(line.toMid?'':arrow));
            line.elem2.setAttribute('d',d+(line.toMid?'':arrow));
            line.hoverElem.setAttribute('d',d);
            if(line.color!==lineColor){
                line.color=lineColor;
                line.elem.setAttribute('stroke',lineColor);
            }

            const c=line.elem.getPointAtLength(line.elem.getTotalLength()/2);
            line.center={x:c.x,y:c.y};
            line.centerBorderElem.setAttribute('cx',Math.round(c.x).toString());
            line.centerBorderElem.setAttribute('cy',Math.round(c.y).toString());

            const p=plusSize/4;
            line.plusElem.setAttribute('d',
                `M ${(c.x)} ${(c.y-p)
                } L ${(c.x)} ${(c.y+p)
                } M ${(c.x-p)} ${(c.y)
                } L ${(c.x+p)} ${(c.y)
                }`
            )

            if(line.ptBorderElem && line.ptPt){
                const pt=(line.isTo?line.edge.toPoints:line.edge.fromPoints)?.[line.ptIndex??0];
                if(pt){
                    line.ptBorderElem.setAttribute('cx',Math.round(line.ptPt.x).toString());
                    line.ptBorderElem.setAttribute('cy',Math.round(line.ptPt.y).toString());
                }
            }
        }

        for(let i=0;i<this.lines.length;i++){
            const line=this.lines[i];
            if(!line){
                continue;
            }
            if(line.updateId!==updateId){
                line.elem.remove();
                line.elem2.remove();
                line.centerElem.remove();
                line.ptElem?.remove();
                this.lines.splice(i,1);
                i--;
            }
        }
    }

    private isConnectedTo(target:ConvoUiLine,address:string,targetEdge?:ConvoEdge)
    {
        if(target.fromAddress===address || target.toAddress===address){
            return true;
        }

        if(!targetEdge){
            targetEdge=this.getEdge(address);
        }

        if(!targetEdge){
            return false;
        }

        return (
            target.fromAddress==targetEdge.from || target.fromAddress==targetEdge.to ||
            target.toAddress==targetEdge.from || target.toAddress==targetEdge.to
        )
    }

    private getEdge(address:string){
        const edges=this.parent.graph.edges;
        for(let i=0;i<edges.length;i++){
            const edge=edges[i];
            if(edge?.id===address){
                return edge;
            }
        }
        return undefined;
    }

    private readonly onLineOver=(e:MouseEvent)=>{
        const line:ConvoUiLine=(e.target as any)[convoElemLineRef];
        line.centerElem.classList.add('hover');
    }

    private readonly onLineOut=(e:MouseEvent)=>{
        const line:ConvoUiLine=(e.target as any)[convoElemLineRef];
        line.centerElem.classList.remove('hover');
    }

    private readonly onPlusClick=(e:MouseEvent)=>{

        const line:ConvoUiLine=(e.target as any)[convoElemLineRef];
        const edge=line.edge;

        if(line.isTo){
            if(!edge.toPoints){
                wSetProp(edge,'toPoints',[]);
            }
            wArySplice(edge.toPoints,line.ptIndex===undefined?0:line.ptIndex+1,0,{...line.center});
        }else{
            if(!edge.fromPoints){
                wSetProp(edge,'fromPoints',[]);
            }
            wArySplice(edge.fromPoints,line.ptIndex===undefined?0:line.ptIndex+1,0,{...line.center});
        }
        this.updateLines(edge.id);
    }

    private readonly onMidContextMenu=(e:MouseEvent)=>{
        e.preventDefault();
        const line:ConvoUiLine=(e.target as any)[convoElemLineRef];
        const edge=line.edge;
        wAryRemoveAt(line.isTo?edge.toPoints:edge.fromPoints,line.ptIndex??0);
        this.updateLines(edge.id);
    }

}

const getLinkColor=(link?:ConvoUiLine):string=>{
    if(link?.color){
        return link.color;
    }
    return '#5F7477';
}

export interface ProtoUiLengthStyle
{
    min:number;
    max:number;
    minOpacity:number;
}

interface LinePt{
    /**
     * Used to order y position
     */
    from:Point;

    /**
     * The target where to draw the line to. This point is mutable
     */
    target:Point;
}

const getDistanceOpacity=(length:number,style:ProtoUiLengthStyle):number=>{
    if(length<=style.min){
        return 1;
    }else if(length>=style.max){
        return style.minOpacity;
    }else{
        length-=style.min;
        const max=style.max-style.min;
        return style.minOpacity+((max-length)/max)*(1-style.minOpacity);
    }
}

const ptToBounds=(pt:Point):Rect=>{
    return {
        x:pt.x-plusSizeHalf,
        y:pt.y-plusSizeHalf,
        width:plusSize,
        height:plusSize,
    }
}

export const convoElemLineRef=Symbol('elemLineRef');

export const convoLineCtrlStyle=atDotCss({name:'ConvoLineCtrl',css:`
    @.centerPt{
        opacity:0;
        cursor:pointer;
        transition:opacity 0.2s ease-in-out;
    }
    @.centerPt:hover{
        opacity:1;
    }
    @.centerPt.hover{
        opacity:1;
    }
    @.midPt{
        cursor:move;
    }
`});
