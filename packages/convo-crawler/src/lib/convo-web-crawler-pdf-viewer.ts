export interface ConvoWebCrawlerPdfViewerOptions
{
    url:string;
    width:number;
    height:number;
}

export const getConvoWebCrawlerPdfViewer=({
    url,
    width,
    height
}:ConvoWebCrawlerPdfViewerOptions)=>{

    return (
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convo Web PDF Viewer</title>
    <script src="https://mozilla.github.io/pdf.js/build/pdf.mjs" type="module"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf_viewer.min.css"/>
    <style>
        html,body{
            padding:0;
            margin:0;
            overflow:hidden;
            width:100%;
            height:100%;
        }
        body{
            background:#999999;
            display:flex;
            justify-content:center;
            align-items:center;
            flex-direction:column;
            font-family:sans-serif;
        }
        #pdf-canvas{
            display:none;
            position:absolute;
            box-shadow: 0 0 32px #00000077;
        }
    </style>
    <script type="module">
        // If absolute URL from the remote server is provided, configure the CORS
        // header on that server.
        var url = ${JSON.stringify(url)};

        // Loaded via <script> tag, create shortcut to access PDF.js exports.
        var { pdfjsLib } = globalThis;

        let pdf=null;
        let pageNumber=0;

        // The workerSrc property shall be specified.
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';


        window.__convoWebLoadPdf=async (url)=>{
            pdf=await pdfjsLib.getDocument(url).promise;
            console.log('PDF',pdf);
        }

        window.__convoWebNextPdfPage=async ()=>{
            if(!pdf){
                return false;
            }

            pageNumber++;
            if(pageNumber>pdf.numPages){
                return false;
            }

            const page=await pdf.getPage(pageNumber);
            console.log('Page loaded');

            const width=${width};
            const height=${height};

            const dv = page.getViewport({scale:1});

            const ar=width/height;
            const dar=dv.width/dv.height;
            const scale = ar>dar?height/dv.height:width/dv.width;
            const viewport = page.getViewport({scale: scale});

            const cw=ar>dar?height*dar:width;
            const ch=ar>dar?height:width/dar;

            console.log('view port',{ar,dar,dv,scale,viewport,page,pdf})

            document.getElementById('pdf-canvas')?.remove();
            // Prepare canvas using PDF page dimensions
            const canvas = document.createElement('canvas');
            canvas.id='pdf-canvas';
            document.body.append(canvas);
            const context = canvas.getContext('2d');
            canvas.width = cw;
            canvas.height = ch;
            canvas.style.width=cw+'px';
            canvas.style.height=ch+'px';
            canvas.style.display='block';
            if(dar>ar){
                canvas.style.top=(height-ch)/2+'px';
            }else{
                canvas.style.left=(width-cw)/2+'px';
            }
            document.querySelectorAll('.loading').forEach(e=>e.remove())

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext);

            return true;
        }
    </script>
</head>
<body>
    <h1 class="loading">Loading PDF...</h1>
    <span class="loading">${url}</span>
</body>
</html>`
    )
}
