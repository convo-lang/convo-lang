import { ConvoViewTheme } from "@convo-lang/convo-lang";
import { cn } from "./util.js";

export interface ConvoLoaderProps
{
    className?:string;
    theme:ConvoViewTheme;
}

export function ConvoLoader({
    className,
    theme,
}:ConvoLoaderProps){

    return (theme.loaderIcon?
        <theme.loaderIcon className={cn(theme.iconClassName,theme.loaderIconClassName,className)}/>
    :
        <div className={cn(theme.iconClassName,theme.loaderIconClassName,className)}>...</div>
    )

}
