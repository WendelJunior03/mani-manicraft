/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js usa pacotes que precisam ser transpilados pelo Next
  transpilePackages: ['three'],
};

module.exports = nextConfig;
