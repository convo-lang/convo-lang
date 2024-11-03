import { BaseLayoutOuterProps, baseLayoutCn } from '@iyio/common';
import { iconSources } from './icon-source';

export type IconType=keyof typeof iconSources;

interface IconProps extends BaseLayoutOuterProps
{
    icon:IconType;
    size?:number|string;
    color?:string;
    noFill?:boolean;
    muted?:boolean;
    className?:string;
    white?:boolean;
    dark?:boolean;
}

export function Icon({
    icon,
    size=16,
    noFill,
    color='#ffffff',
    ...props
}:IconProps){

    return (iconSources[icon]??iconSources.default)({size,color,className:baseLayoutCn(props)});

}
