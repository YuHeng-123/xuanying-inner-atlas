/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/xuanying-inner-atlas" : undefined;

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.EXPERIENCE_PREVIEW === "1" ? ".next-experience" : ".next",
  ...(isGitHubPages ? {
    output: "export",
    basePath,
    assetPrefix: basePath,
    trailingSlash: true,
    env: { NEXT_PUBLIC_BASE_PATH: basePath },
    images: { unoptimized: true },
  } : {}),
  transpilePackages: ["echarts", "zrender", "three"],
  experimental: { cpus: 1, webpackBuildWorker: false },
};

export default nextConfig;
