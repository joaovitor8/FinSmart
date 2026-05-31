import type { NextConfig } from "next";

// Headers de segurança estáticos. O CSP NÃO está aqui — fica em `src/proxy.ts`
// porque depende de nonce gerado por request.
const securityHeaders = [
  // Força HTTPS depois da primeira visita (browsers ignoram para localhost)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Anti clickjacking — redundante com frame-ancestors no CSP, mas cobre browsers antigos
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
