import { escapeHtml } from "@iyio/common";

const cr='__CrawlerPreviewer__';

function convoWebCrawlerOutputPreviewer()
{

// must redefine in scope
const cr='__CrawlerPreviewer__';

interface LoadOptions{
    plain?:boolean;
}

class CrawlerPreviewer
{

    private _md:any=null;
    private getMd()
    {
        if(this._md){
            return this._md;
        }
        this._md=(window as any).markdownit({
            html:true,
            linkify:true,
            typographer:true
        });

        return this._md;
    }

    private renderMdAsHtml(md:string):string{
        return (this.getMd().render(md) as string).replace(/<(h[1-6])\s*>([^<]*)</g,(_,tag:string,content:string)=>{
            return `<${tag} id="${escapeHtml(content.replace(/\s/g,'-'))}">${content}<`
        }).replace(/<a\s+href="([^#])/g,(_,c:string)=>'<a target="_blank" href="'+c);
    }

    public loadFileAsync(path:string,options?:LoadOptions){

        const target=document.querySelector('#render-area');
        if(!target){
            throw new Error('#render-area not found');
        }

        let html:Promise<string>|null=null;
        let head=escapeHtml(path);
        const lp=path.toLowerCase();
        const ei=lp.lastIndexOf('.');
        const ext=lp.substring(ei+1);
        let highlight=false;
        switch(ext){

            case 'md':
                html=options?.plain?this.loadCodeAsync(path,'markdown'):this.loadMarkdownAsync(path);
                head=`
                    <span>${head}</span>
                    <span>
                        <button class="button" onclick="${cr}.loadFileAsync('${path}')">html</button>
                        <button class="button" onclick="${cr}.loadFileAsync('${path}',{plain:true})">markdown</button>
                        <a class="button" target="_blank" href="${path}?format=pdf">PDF</a>
                    </span>
                `;
                if(options?.plain){
                    highlight=true;
                }
                break;

            case 'jpg':
            case 'jpeg':
            case 'png':
                html=Promise.resolve(`<img class="content-image" src="${path}"/>`);
                break;

            case 'pdf':
                html=Promise.resolve(`<iframe class="content-frame" src="${path}"></iframe>`);
                break;

            case 'json':
                html=this.loadCodeAsync(path,'json');
                highlight=true;
                break;

            default:
                html=Promise.resolve(`No view type found for ".${ext}"`);
                break;


        }
        html?.then(v=>{
            target.innerHTML=v;
            if(highlight){
                (window as any).hljs.highlightAll()
            }
        });
        const headElem=document.querySelector('.main-head');
        if(headElem){
            headElem.innerHTML=head??'';
        }
    }

    private loadMarkdownAsync(path:string){
        return fetch(path).then(response=>{
            return response.text().then(md=>{
                return `<div class="scroll-container markdown-content">${this.renderMdAsHtml(md)}</div>`
            })
        })
    }

    private loadCodeAsync(path:string,lang:string){
        return fetch(path).then(response=>{
            return response.text().then(text=>{
                return `<div class="scroll-container-h"><pre><code class="content-code language-${lang}">${escapeHtml(text)}</code></pre></div>`
            })
        })
    }

    public initListeners()
    {
        window.addEventListener('message',evt=>{
            if(evt.data==='convo-reload'){
                location.reload();
            }
        })
    }
}

const escapeHtml=(str:string):string=>
{
    if(!str){
        return '';
    }
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

const previewer=new CrawlerPreviewer();
previewer.initListeners();
(window as any).__CrawlerPreviewer__=previewer;
}

const fnName='_________convoWebCrawlerOutputPreviewer';

const maxNameLength=22;

export interface CreateWebCrawlerOutputPreviewerOptions
{
    baseDir:string;
    files:ConvoWebFileRef[];
    fileAction:'load-file'|'link';
    title?:string;
    back?:boolean;
    wideLinks?:boolean;
}

export interface ConvoWebFileRef
{
    name:string;
    path:string;
    date?:string;
}

const startWithGuidReg=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const enbWithGuidReg=/-?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
//84edb47d-264f-4462-b5d5-4c84e5c60d24

export const createWebCrawlerOutputPreviewer=({
    baseDir,
    files,
    fileAction,
    title,
    back,
    wideLinks
}:CreateWebCrawlerOutputPreviewerOptions)=>
{
    files=[...files];
    files.sort();
    if(fileAction==='load-file'){
        files.sort((a,b)=>(startWithGuidReg.test(a.name)?1:0)-(startWithGuidReg.test(b.name)?1:0));
    }

    const fnJs=convoWebCrawlerOutputPreviewer.toString().replace(/^function\s+\w+/,`function ${fnName}`);
    return (
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convo Crawler</title>
    <style>${css}</style>
    <script src="https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js"></script>
    <script>${fnJs}</script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/markdown.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/json.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</head>
<body onload="${fnName}()">
    <div class="main-layout">
        <div class="side-bar${wideLinks?' wide':''}">
            <div class="scroll-container">
                <ul class="file-list">
                    ${back?'<li><a href="..">back</a></li>':''}
                    ${fileAction==='load-file'?files.map((f)=>{

                        let name=f.name;
                        if(name.length>maxNameLength){
                            name=name.substring(0,Math.floor(maxNameLength/2-3))+'...'+name.substring(name.length-Math.floor(maxNameLength/2))
                        }


                        return (
                            `<li><button class="file-button" onclick='${cr}.loadFileAsync(${JSON.stringify(`/${baseDir}/${f.path}`)})'>${escapeHtml(name)}</button></li>`
                        )

                    }).join('\n'):''}

                    ${fileAction==='link'?files.map((f)=>{
                        return (
                            `<li><a href="${escapeHtml(f.path)}" class="file-button">${escapeHtml(f.name.replace(enbWithGuidReg,''))}</a></li>`
                        )

                    }).join('\n'):''}

                </ul>
            </div>
        </div>
        <div class="main-content">
            ${title?`<div class="main-head">${escapeHtml(title)}</div>`:''}
            <div id="render-area"></div>
        </div>
    </div>
</body>
</html>`
    )
}

const css=/*css*/`
body,html{
    width:100%;
    height:100%;
    margin:0;
    padding:0;
    overflow:hidden;
    overflow:clip;
}
body{
    font-family: "Inter", sans-serif;
    font-optical-sizing: auto;
    font-variation-settings: "slnt" 0;
}
.main-layout{
    display:flex;
    width:100%;
    height:100%;
}
.side-bar{
    display:flex;
    flex-direction:column;
    width:200px;
    position:relative;
    background:#f5f5f5;
}
.side-bar.wide{
    width:100%;
}
.main-content, #render-area{
    display:flex;
    flex-direction:column;
    position:relative;
    flex:1;
}
#render-area{
    margin-left:1rem;
}
.scroll-container, .scroll-container-h{
    position:absolute;
    left:0;
    right:0;
    top:0;
    bottom:0;
    overflow-x:hidden;
    overflow-y:auto;
}
.scroll-container-h{
    overflow-x:auto;
}
.file-list{
    list-style:none;
    margin:0;
    display:flex;
    flex-direction:column;
    gap:0.5rem;
    padding:0.7rem;
}
.file-button{
    border:none;
    background:none;
    text-align:left;
    padding:0.25rem;
    cursor:pointer;
}
.file-group{
    font-size:0.5rem;
    opacity:0.8;
    padding:0.1rem;
    margin-top:1rem;
    margin-bottom:0.2rem;
}
.content-image{
    height:100%;
    width:100%;
    object-fit:contain;
    position:absolute;
}
.content-code{
    white-space:pre;
}
.content-frame{
    height:100%;
    width:100%;
    border:none;
}
.markdown-content img{
    max-height:300px;
}
.main-head{
    display:flex;
    justify-content:space-between;
    background:#f5f5f5;
    padding:0.5rem;
}
.hljs{
    _background:transparent !important;
}
.button{
    background: #ffffff;
    border-radius: 5px;
    padding: 0.2rem 0.5rem;
    letter-spacing: 0.05em;
    border:1px solid #aaa;
    text-decoration:none;
    font-size:1rem;
    color:#333;
}
`
