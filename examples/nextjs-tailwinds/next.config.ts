import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactStrictMode: true,
    transpilePackages: [
        '@convo-lang/convo-lang',
        '@convo-lang/convo-lang-react',
        '@convo-lang/convo-lang-api-routes',
    ],

    devIndicators: false,

    webpack: (config, { webpack }) => {
        config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(
                new RegExp(/\.js$/),
                function (resource: any) {
                    if (!resource.context?.includes("node_modules")) {
                        resource.request = resource.request.replace(".js", "");
                    }
                },
            ),
        );
        return config;
    },
};

export default nextConfig;
