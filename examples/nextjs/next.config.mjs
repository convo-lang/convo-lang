/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental:{
    serverActions:{
        bodySizeLimit:'1000mb'
    }
  }
};

export default nextConfig;
