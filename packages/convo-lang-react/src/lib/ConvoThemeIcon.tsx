import { ConvoIconType, ConvoViewTheme } from "@convo-lang/convo-lang";
import { cn } from "./util.js";

export interface ConvoThemeIconProps<K extends keyof ConvoViewTheme>
{
    className?:string;
    theme:ConvoViewTheme;
    icon:K;
    fallback?:ConvoIconType
}

export function ConvoThemeIcon<K extends keyof ConvoViewTheme>({
    className,
    theme,
    icon,
    fallback,
}:ConvoThemeIconProps<K>){

    const Icon=(theme[icon] as ConvoIconType)??fallback;

    return (!Icon?null:
        <Icon className={cn(theme.iconClassName,className,(theme as any)[icon+'ClassName'])} />
    )

}
