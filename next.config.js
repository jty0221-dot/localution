/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // SEO · 보안 헤더
  // 로그인 뒤 화면은 검색 · AI 봇 색인에서 뺀다 (robots.ts 의 disallow 와 같은 목록 · app/lib/seo.ts PRIVATE_PATHS)
  // 보안 헤더는 화면을 깨지 않는 것만 (CSP 는 인라인 스크립트 · 외부 위젯 정리 뒤 형권 처방으로)
  async headers() {
    const noIndex = [
      '/admin/:path*', '/admin-biz/:path*', '/qr-admin/:path*', '/qr', '/my/:path*', '/settings/:path*',
      '/dashboard/:path*', '/review-admin/:path*', '/reviews/:path*', '/crm/:path*', '/customers/:path*',
      '/reservations/:path*', '/settlement/:path*', '/partner-points/:path*', '/auth/:path*',
      '/locked', '/whoami', '/marketing/naver-check', '/marketing/threads/connect', '/api/:path*',
    ]
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self)' },
    ]
    return [
      { source: '/:path*', headers: security },
      ...noIndex.map((source) => ({ source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] })),
    ]
  },
  // undici 는 server-side require() 로만 쓰이므로 webpack 번들 제외
  // (v5 도 일부 syntax 가 next-swc-loader 와 호환 안 될 수 있어 안전하게 external)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push({ undici: 'commonjs undici' })
      }
    }
    return config
  },
};

module.exports = nextConfig;
// undici externalize for proxy-fetch require()
