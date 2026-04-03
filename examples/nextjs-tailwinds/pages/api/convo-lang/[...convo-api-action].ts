import { createConvoLangApiRoutes } from "@convo-lang/convo-lang-api-routes";
import { createHttpRouter } from "@iyio/node-common";

export default createHttpRouter({routes:createConvoLangApiRoutes({
    prefix:'/api/convo-lang/',
    autoInit:true,
})});;
