import { atDotCss } from "@iyio/at-dot-css";
import { BaseLayoutOuterProps } from "@iyio/common";
import { useWObjProp } from "@iyio/react-common";
import { useConvoGraphViewCtrl } from "./convo-graph-react-lib";

export interface ConvoNodeSelectorProps
{
    /**
     * Id of selected node
     */
    value?:string;

    onChange?:(id:string|undefined)=>void;

    emptyLabel?:string;
}

export function ConvoNodeSelector({
    value,
    onChange,
    emptyLabel,
    ...props
}:ConvoNodeSelectorProps & BaseLayoutOuterProps){

    const ctrl=useConvoGraphViewCtrl();

    const nodes=[
        ...useWObjProp(ctrl.graph,'nodes'),
        ...useWObjProp(ctrl.graph,'inputs'),
    ];
    nodes.sort((a,b)=>`${a.name} (${b.id})`.localeCompare(`${b.name} (${b.id})`))


    return (
        <select className={style.root(null,null,props)} value={value??''} onChange={e=>onChange?.(e.target.value||undefined)}>

            {!!emptyLabel && <option value="">{emptyLabel}</option>}

            {nodes.map(n=>(
                <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
            ))}

        </select>
    )

}

const style=atDotCss({name:'ConvoNodeSelector',css:`
    @.root{
        display:flex;
        flex-direction:column;
        max-width:250px;
    }
`});
