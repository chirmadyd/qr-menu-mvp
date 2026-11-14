import type { NextConfig } from "next";

const editorOrigin = process.env.PAGES_EDITOR_ORIGIN;

const nextConfig: NextConfig = {
  async headers() {
    if (!editorOrigin) return [];
    return [{
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: new URL(editorOrigin).origin },
        { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type" },
      ],
    }];
  },
};

export default nextConfig;
