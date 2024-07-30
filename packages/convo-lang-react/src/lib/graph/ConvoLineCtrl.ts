import { Point, ReadonlySubject, getDistanceBetweenPoints } from "@iyio/common";
import { BehaviorSubject } from "rxjs";
import { ConvoGraphViewCtrl } from "./ConvoGraphViewCtrl";
import { ConvoUiLine } from "./convo-graph-react-type";

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
        minOpacity:0.2,
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

    private getLine(excludeUpdateId:number,fromAddress:string,toAddress:string){
        for(const line of this.lines){
            if( line.updateId!==excludeUpdateId &&
                line.fromAddress===fromAddress &&
                line.toAddress===toAddress)
            {
                return line;
            }
        }
        return null;
    }

    private insertLineElements(line:ConvoUiLine){
        line.elem.remove();
        line.elem2.remove();
        this._lineGroup?.appendChild(line.elem2);
        this._lineGroup?.appendChild(line.elem);
    }

    public updateLines(onlyForAddress?:string)
    {
        // const group=this._lineGroup;
        // const groupLow=this._lineGroupLow;

        // if(!group || !groupLow){
        //     return;
        // }
        const updateId=++this.lineUpdateId;

        //const addressMap=this.parent.addressMap;

        // const updateNodeLayout=(node:ProtoNode)=>{
        //     (protoGetNodeCtrl(node) as NodeCtrl|undefined)?.updateLayout(50);
        // }

        for(let i=0,l=this.parent.graph.edges.length*2;i<l;i++){
            const index=Math.floor(i/2);
            const toSide=(i%2)?true:false;
            const edge=this.parent.graph.edges[index]

            if(!edge){
                continue;
            }

            const fromId=toSide?edge.id:edge.from;
            const toId=toSide?edge.to:edge.id;

            const end=this.parent.entityCtrls[toId];
            const start=this.parent.entityCtrls[fromId];
            if(!end || !start){
                continue;
            }


            let line=this.getLine(updateId,fromId,toId);

            const lineColor=getLinkColor(line??undefined);

            if(!line){
                line={
                    fromAddress:fromId,
                    toAddress:toId,
                    updateId,
                    elem:document.createElementNS("http://www.w3.org/2000/svg", "path"),
                    elem2:document.createElementNS("http://www.w3.org/2000/svg", "path"),
                    p1:{x:0,y:0},
                    p2:{x:0,y:0},
                    color:lineColor,
                }
                line.elem.setAttribute('stroke',lineColor);
                line.elem.setAttribute('fill','none');
                line.elem.setAttribute('stroke-width','2');
                line.elem2.setAttribute('stroke','#0C0C0C');
                line.elem2.setAttribute('stroke-width','4');
                line.elem2.setAttribute('fill','none');
                this.lines.push(line);
                this.insertLineElements(line);
            }

            // if(priority!==line.priority){
            //     line.priority=priority;
            //     this.insertLineElements(line);
            // }

            if( onlyForAddress!==undefined &&
                line.fromAddress!==onlyForAddress &&
                line.toAddress!==onlyForAddress
            ){
                line.updateId=updateId;
                continue;
            }

            const startB=start.getElementBounds({type:'shell'});
            const endB=end.getElementBounds({type:'shell'});
            if(!startB || !endB){
                continue;
            }

            let dist=Number.MAX_SAFE_INTEGER;

            let dir1:1|-1=1;
            let dir2:1|-1=1;


            const startOffset=start.getElementBounds({type:'shell'})??{x:0,y:0,width:0,height:0}
            const endOffset=end.getElementBounds({type:'shell'})??{x:0,y:0,width:0,height:0}

            let startPt:Point={x:startOffset.x,y:startOffset.y+startOffset.height/2};
            let endPt:Point={x:endOffset.x,y:endOffset.y+endOffset.height/2};
            let checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=-1;
                dir2=-1;
            }

            startPt={x:startOffset.x+startOffset.width,y:startOffset.y+startOffset.height/2};
            endPt={x:endOffset.x,y:endOffset.y+endOffset.height/2};
            checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=1;
                dir2=-1;
            }

            startPt={x:startOffset.x,y:startOffset.y+startOffset.height/2};
            endPt={x:endOffset.x+endOffset.width,y:endOffset.y+endOffset.height/2};
            checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=-1;
                dir2=1;
            }

            startPt={x:startOffset.x,y:startOffset.y+startOffset.height/2};
            endPt={x:endOffset.x,y:endOffset.y+endOffset.height/2};
            checkDist=getDistanceBetweenPoints(startPt,endPt);
            if(checkDist<dist){
                dist=checkDist;
                line.p1=startPt;
                line.p2=endPt;
                dir1=1;
                dir2=1;
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
            const d=(
                `M ${Math.round(line.p1.x)} ${Math.round(line.p1.y)
                } C ${Math.round(line.p1.x+(dir*dir1))} ${Math.round(line.p1.y)
                } ${Math.round(line.p2.x+(dir*dir2))} ${Math.round(line.p2.y)
                }  ${Math.round(line.p2.x)} ${Math.round(line.p2.y)}`
            )
            line.elem.setAttribute('d',d);
            line.elem2.setAttribute('d',d);
            if(line.color!==lineColor){
                line.color=lineColor;
                line.elem.setAttribute('stroke',lineColor);
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
                this.lines.splice(i,1);
                i--;
            }
        }
    }
}

const getLinkColor=(link?:ConvoUiLine):string=>{
    if(link?.color){
        return link.color;
    }
    return '#88B6BA99';
}

export interface ProtoUiLengthStyle
{
    min:number;
    max:number;
    minOpacity:number;
}

const getDistanceOpacity=(length:number,style:ProtoUiLengthStyle):number=>{
    if(length<=style.min){
        return 1;
    }else if(length>=style.max){
        return style.minOpacity;
    }else{
        length-=style.min;
        const max=style.max-style.min;
        return style.minOpacity+ ((max-length)/max)*(1-style.minOpacity);
    }
}
