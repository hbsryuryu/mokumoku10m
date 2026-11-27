import type { NextConfig } from "next";

// ADR-0010: ブラウザからは同じオリジンに見せるため、/api/* を FastAPI に転送する。
// ログインの Cookie（HttpOnly・SameSite=Lax）がそのまま使え、CORS の設定が要らない。
// Docker では http://api:8000、手元で直接動かすときは http://localhost:8000。
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Googleからの認可コードやstateを開発サーバーのアクセスログへ出さない。
  logging: { incomingRequests: { ignore: [/\/api\/v1\/auth\/google/] } },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
