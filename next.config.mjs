/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['*'] // Allow all origins for server actions
    }
  }
  // Note: When deploying to Vercel, add this to vercel.json:
  // {
  //   "functions": {
  //     "actions/import-export.ts": {
  //       "maxDuration": 300
  //     }
  //   }
  // }
}

export default nextConfig
