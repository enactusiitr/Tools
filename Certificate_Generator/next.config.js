/** @type {import('./Certificate_Generator/node_modules/next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

module.exports = nextConfig;
