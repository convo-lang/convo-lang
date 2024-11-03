import { createConvoLangApiRoutes } from "@convo-lang/convo-lang-api-routes";
import { initOpenAiBackend } from '@convo-lang/convo-lang-openai';
import { createHttpRouter } from "@iyio/node-common";

initOpenAiBackend();

const routes=createConvoLangApiRoutes({prefix:'/api/convo-lang/'});

const handler=createHttpRouter({routes});

export default handler;

