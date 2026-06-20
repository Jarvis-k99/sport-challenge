/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Activity-photo uploads can be up to 4 MB; raise the parsed-body
      // cap to comfortably fit photo + form fields. Vercel Hobby's
      // platform-level 4.5 MB hard limit still applies.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
