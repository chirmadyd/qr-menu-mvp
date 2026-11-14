import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/QR-TransLate-Menu",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
