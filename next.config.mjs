import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker builds
  
  // Optimize for hybrid server/client architecture
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    optimizePackageImports: ['@/components', '@/lib'],
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    
    // Optimize for client-heavy components
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // Build configuration for Docker compatibility
  distDir: '.next',
  trailingSlash: false,
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Handle dynamic imports properly
  transpilePackages: ['@/components', '@/lib'],
};

export default nextConfig;
