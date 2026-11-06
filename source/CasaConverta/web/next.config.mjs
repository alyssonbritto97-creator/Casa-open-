// Exportação estática: o Next.js gera arquivos que o celular do administrador serve em /next/
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/next',
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
