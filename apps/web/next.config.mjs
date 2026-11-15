/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/v1/**/*": ["./data/source-documents/**/*"],
    },
  },
};

export default nextConfig;
