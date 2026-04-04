import { ConvoIconType, ConvoViewTheme } from "@convo-lang/convo-lang";
import { cn } from "./util.js";

export interface ConvoThemeIconProps<K extends keyof ConvoViewTheme>
{
    className?:string;
    theme:ConvoViewTheme;
    icon:K;
}

export function ConvoThemeIcon<K extends keyof ConvoViewTheme>({
    className,
    theme,
    icon,
}:ConvoThemeIconProps<K>){

    const Icon=theme[icon] as ConvoIconType;

    return (!Icon?null:
        <Icon className={cn(theme.iconClassName,className,(theme as any)[icon+'ClassName'])} />
    )

}
