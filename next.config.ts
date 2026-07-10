import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfjs-dist pulls in Node-only optional deps (`canvas`, `fs`) that must not
  // be bundled for the browser. Turbopack (default bundler in Next 16) resolves
  // them to an empty module for the browser condition.
  turbopack: {
    resolveAlias: {
      canvas: { browser: "./empty.ts" },
      fs: { browser: "./empty.ts" },
    },
  },
};

export default nextConfig;
