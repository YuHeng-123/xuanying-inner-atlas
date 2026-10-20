/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.EXPERIENCE_PREVIEW === "1" ? ".next-experience" : ".next",
  transpilePackages: ["echarts", "zrender", "three"],
  experimental: { cpus: 1, webpackBuildWorker: false },
};

export default nextConfig;
