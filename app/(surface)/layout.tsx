import { SURFACE_BUILD } from '@/lib/surface'

/**
 * The surface owns the whole document. page.css styles `body` itself and keys
 * fifteen selectors off `body[data-screen]`, page.js writes that attribute, and
 * `.screen` is 100svh tall — so the site chrome, its `<body>` utility classes
 * and globals.css all have to stay out of this tree. Hence a second root layout
 * rather than a branch inside the first one. Crossing between the two root
 * layouts costs a full page load, which is what we want here: the surface
 * always starts from a fresh document.
 */
export default function SurfaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css"
          rel="stylesheet"
        />
        <link
          href={`/assets/surface/page.css?v=${SURFACE_BUILD}`}
          rel="stylesheet"
        />
      </head>
      {/* page.js flips data-screen between "city" and "cluster"; the stylesheet
          reads it. The markup of both screens ships in one document. */}
      <body data-screen="city">{children}</body>
    </html>
  )
}
