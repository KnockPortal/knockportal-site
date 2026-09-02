import { createRequire } from 'node:module'

// The demo list lives in exactly one place; the surface route reads the same file.
const require = createRequire(import.meta.url)
const demoCompanies = require('./lib/demo-companies.json')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old addresses of the surface. /sf was the public page; /sf/<slug> was a
  // generated file per contractor, and the contractor is now a query parameter.
  //
  // The 25 are spelled out one by one on purpose. A wildcard source over the
  // second segment would also match /sf/roofing itself and loop for ever; a
  // literal list cannot, since no demo slug is "roofing".
  //
  // Routes of the retired product model. The pages are gone; the addresses were
  // printed in outreach, so they land on the home page instead of a 404.
  // /api/request is deliberately absent — a removed API route must answer 404.
  async redirects() {
    return [
      { source: '/sf', destination: '/sf/roofing', permanent: true },
      ...demoCompanies.map(({ slug }) => ({
        source: `/sf/${slug}`,
        destination: `/sf/roofing?from=${slug}`,
        permanent: true,
      })),
      { source: '/contractors', destination: '/', permanent: true },
      { source: '/coverage', destination: '/', permanent: true },
      { source: '/request', destination: '/', permanent: true },
      { source: '/how-it-works', destination: '/', permanent: true },
      { source: '/pricing', destination: '/', permanent: true },
      // The contact page is now a section of /about. The address is indexed, so it
      // is redirected rather than left to answer 404.
      { source: '/contact', destination: '/about', permanent: true },
    ]
  },
}

export default nextConfig
