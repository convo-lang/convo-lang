import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactStrictMode: true,
    transpilePackages: [
        '@convo-lang/convo-crawler',
        '@convo-lang/convo-lang',
        '@convo-lang/convo-lang-api-routes',
        '@convo-lang/convo-lang-aws-cdk',
        '@convo-lang/convo-lang-bedrock',
        '@convo-lang/convo-lang-browser',
        '@convo-lang/convo-lang-cli',
        '@convo-lang/convo-lang-doc-query',
        '@convo-lang/convo-lang-make',
        '@convo-lang/convo-lang-mcp-client',
        '@convo-lang/convo-lang-pdf',
        '@convo-lang/convo-lang-pinecone',
        '@convo-lang/convo-lang-react',
        '@convo-lang/db',
        '@convo-lang/hono',
        '@convo-lang/tui',
        '@convo-lang/highlighter',
        '@convo-lang/studio',
    ],

    devIndicators: false,

    // webpack: (config, { webpack }) => {
    //     config.plugins.push(
    //         new webpack.NormalModuleReplacementPlugin(
    //             new RegExp(/\.js$/),
    //             function (resource: any) {
    //                 if (!resource.context?.includes("node_modules")) {
    //                     resource.request = resource.request.replace(".js", "");
    //                 }
    //             },
    //         ),
    //     );
    //     return config;
    // },
};

export default nextConfig;
