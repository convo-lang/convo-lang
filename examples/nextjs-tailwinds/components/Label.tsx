import { cn } from "@convo-lang/convo-lang-react";

export interface LabelProps
{
    className?:string;
    label:string;
    htmlFor?:string;
    children?:any;
    row?:boolean;
}

export function Label({
    className,
    label,
    htmlFor=label,
    children,
    row
}:LabelProps){

    return (
        <div className={cn("flex",row?'items-center gap-2':'flex-col',className)}>
            <label htmlFor={htmlFor} className="text-sm opacity-50">{label}</label>
            {children}
        </div>
    )

}
