
export interface ConvoMarkdownRenderer
{
    render(markdown:string):string;
}
let md:ConvoMarkdownRenderer|undefined;

export const getMdAsync=async ():Promise<ConvoMarkdownRenderer>=>{
    if(md){
        return md;
    }
    let markdownit:any=await import('markdown-it');
    if(typeof markdownit.default === 'function'){
        markdownit=markdownit.default;
    }
    md=markdownit() as ConvoMarkdownRenderer;
    return md;
}

export const getMd=():ConvoMarkdownRenderer|undefined=>{
    if(!md){
        getMdAsync();
    }
    return md;
}

export const renderMdToTarget=(markdown:string,target:HTMLElement,renderRef?:{id:number})=>{
    if(md){
        target.innerHTML=renderMd(markdown,md);
    }
    const id=renderRef?.id;
    getMdAsync().then(md=>{
        if(id===renderRef?.id){
            target.innerHTML=renderMd(markdown,md);
        }
    })
}

export const renderMd=(markdown:string,md:ConvoMarkdownRenderer):string=>{
    const match=mdBlock.exec(markdown);
    if(match){
        let m=markdown.substring(match[0].length).trim();
        if(m.endsWith('```')){
            m=m.substring(0,m.length-3);
        }
        return md.render(m);
    }else{
        return md.render(markdown);
    }
}

const mdBlock=/[\s\n\r]*```\s*(md|markdown).*/
