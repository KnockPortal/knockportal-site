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
};

export default nextConfig;
