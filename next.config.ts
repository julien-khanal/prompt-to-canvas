import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok.app", "*.ngrok.io"],
};

export default nextConfig;
