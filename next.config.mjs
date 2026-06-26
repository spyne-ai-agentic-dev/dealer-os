/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Studio OS prototype animates drawers/screens with gsap `.from()` tweens.
  // React StrictMode's dev-only double-invoke of effects strands those tweens at
  // their start offset (e.g. a drawer stuck translated off-screen), so CTAs like
  // "Fix with Studio Instant" appear to do nothing. Disabling StrictMode makes dev
  // match production behaviour (effects run once); it has no production impact.
  reactStrictMode: false,
  async redirects() {
    return [
      { source: "/max-2/lot-view", destination: "/max-2/studio/media-lot", permanent: false },
      {
        source: "/max-2/lot-view/inventory",
        destination: "/max-2/studio/media-lot/inventory",
        permanent: false,
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
}

export default nextConfig
