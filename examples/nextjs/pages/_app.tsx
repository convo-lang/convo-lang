import { Layout } from "@/components/Layout";
import { initFrontend } from "@/lib/frontendModule";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {

    useEffect(()=>{
        initFrontend();
    },[]);

    return (
        <Layout>
            <Head>
                <title>Convo-Lang NextJs</title>
                <meta name="description" content="Example of using Convo-Lang with NextJS" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Component {...pageProps} />
        </Layout>
    )
}
