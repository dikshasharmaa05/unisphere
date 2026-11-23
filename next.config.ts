import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Bundle the PDF fonts with the route that generates article PDFs.
  outputFileTracingIncludes: { "/articles/[slug]/pdf": ["./src/lib/pdf/fonts/**"] },
};

export default nextConfig;
