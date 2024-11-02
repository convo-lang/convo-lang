interface IconSourceProps{
    size:number|string;
    color?:string;
    className?:string;
}

export const iconSources={
    'default':({size,color,className}:IconSourceProps)=><svg className={className} width={size} height={size} fill={color} viewBox="0 0 320 512"><path d="M144 416c-17.67 0-32 14.33-32 32s14.33 32.01 32 32.01s32-14.34 32-32.01S161.7 416 144 416zM211.2 32H104C46.66 32 0 78.66 0 136v16C0 165.3 10.75 176 24 176S48 165.3 48 152v-16c0-30.88 25.12-56 56-56h107.2C244.7 80 272 107.3 272 140.8c0 22.66-12.44 43.27-32.5 53.81L167 232.8C137.1 248 120 277.9 120 310.6V328c0 13.25 10.75 24.01 24 24.01S168 341.3 168 328V310.6c0-14.89 8.188-28.47 21.38-35.41l72.47-38.14C297.7 218.2 320 181.3 320 140.8C320 80.81 271.2 32 211.2 32z"/></svg>,
    'empty':({size,color,className}:IconSourceProps)=><svg className={className} width={size} height={size} fill={color} viewBox="0 0 320 512"></svg>,
    "circle-up":({size,color,className}:IconSourceProps)=><svg className={className} width={size} height={size} fill={color} viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm11.3-395.3l112 112c4.6 4.6 5.9 11.5 3.5 17.4s-8.3 9.9-14.8 9.9l-64 0 0 96c0 17.7-14.3 32-32 32l-32 0c-17.7 0-32-14.3-32-32l0-96-64 0c-6.5 0-12.3-3.9-14.8-9.9s-1.1-12.9 3.5-17.4l112-112c6.2-6.2 16.4-6.2 22.6 0z"/></svg>,
    // END - do not remove this line.
    // Use the /scripts/add-icon.sh script to add new icons to this list
    // example - scripts/add-icon.sh user
}
