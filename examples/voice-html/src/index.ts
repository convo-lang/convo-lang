import { getConvoHonoRoutes } from "@convo-lang/hono";
import { serve } from "bun";
import index from "./index.html";

const convoApp=getConvoHonoRoutes();

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/": index,
    "/index.html": index,
  },

  fetch(request){
    console.log('Convo API',request.url);
    return convoApp.fetch(request);
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },

});

console.log(`🚀 Server running at ${server.url}`);
