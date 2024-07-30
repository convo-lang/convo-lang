import { delayAsync } from "@iyio/common";
import { ConvoWebCrawler } from "./ConvoWebCrawler";
import { getConvoCrawlerApiOptionsFromEnvAsync } from "./convo-web-crawler-lib";

export const createConvoWebPdfFromMdAsync=async (markdown:string)=>{
    let markdownit=await import('markdown-it');
    if((markdownit as any).default){
        markdownit=(markdownit as any).default;
    }
    const crawler=new ConvoWebCrawler(await getConvoCrawlerApiOptionsFromEnvAsync());
    const browser=await crawler.getBrowserAsync();
    const page=await browser.newPage();
    try{
        const md = markdownit()
        const result = md.render(markdown);
        await page.setContent(
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convo PDF</title>
    <style>${css}</style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
</head>
<body>
    ${result}
</body>
</html>`,
        {waitUntil:['load','domcontentloaded','networkidle2']});
        await delayAsync(1000);
        return await page.pdf();
    }finally{
        page.close();
    }

}


const css=/*css*/`
html{
    margin:0;
    padding:0;
}
body{
    font-family: "Inter", sans-serif;
    font-optical-sizing: auto;
    font-variation-settings: "slnt" 0;
    margin:0;
    padding:1rem 2rem;
}
`
