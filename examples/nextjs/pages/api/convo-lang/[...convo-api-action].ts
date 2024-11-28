import { initBackend } from "@/lib/init-backend";
import { createConvoLangApiRoutes } from "@convo-lang/convo-lang-api-routes";
import { createOpenAiConvoImageGenerator } from '@convo-lang/convo-lang-openai';
import { createHttpRouter } from "@iyio/node-common";

initBackend();

const routes=createConvoLangApiRoutes({
    prefix:'/api/convo-lang/',
    enableVfs:true,
    enableCaching:true,
    publicWebBasePath:'/',
    fsRoot:'.',
    imageGenCallback:createOpenAiConvoImageGenerator(),
});

const handler=createHttpRouter({routes});

export default handler;

