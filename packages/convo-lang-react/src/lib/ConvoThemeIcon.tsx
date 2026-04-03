import { ConvoIconType, ConvoViewTheme } from "@convo-lang/convo-lang";
import { cn } from "./util.js";

export interface ConvoThemeIconProps<K extends keyof ConvoViewTheme>
{
    theme:ConvoViewTheme;
    icon:K;
}

export function ConvoThemeIcon<K extends keyof ConvoViewTheme>({
    theme,
    icon,
}:ConvoThemeIconProps<K>){

    const Icon=theme[icon] as ConvoIconType;

    return (!Icon?null:
        <Icon className={cn(theme.iconClassName,(theme as any)[icon+'ClassName'])} />
    )

}
