import { initBackend } from "@/lib/init-backend";
import { createHttpRouter } from "@iyio/node-common";
import { createVfsApiRoutes } from "@iyio/vfs-node";

initBackend();

const routes=createVfsApiRoutes({prefix:'/api/filesystem'})

const handler=createHttpRouter({routes});

export default handler;

