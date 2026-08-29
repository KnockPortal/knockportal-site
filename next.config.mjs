/** @type {import('next').NextConfig} */
const nextConfig = {
  // /sf is a standalone static page in public/sf.html — it deliberately does not
  // share the Next layout, header or nav. This rewrite makes it answer at /sf
  // (the address printed in outreach) without renaming the file.
  async rewrites() {
        return [
      { source: '/sf', destination: '/sf.html' },
      { source: '/sf/:slug', destination: '/sf/:slug.html' },
    ]
  },

  // Routes of the retired product model. The pages are gone; the addresses were
  // printed in outreach, so they land on the home page instead of a 404.
  // /api/request is deliberately absent — a removed API route must answer 404.
  async redirects() {
    return [
      { source: '/contractors', destination: '/', permanent: true },
      { source: '/coverage', destination: '/', permanent: true },
      { source: '/request', destination: '/', permanent: true },
      { source: '/how-it-works', destination: '/', permanent: true },
      { source: '/pricing', destination: '/', permanent: true },
    ]
  },
};

export default nextConfig;
