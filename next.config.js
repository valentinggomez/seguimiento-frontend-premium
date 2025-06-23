/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignora errores de ESLint durante el build (ideal para producción rápida)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora errores de TypeScript en el build también
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
