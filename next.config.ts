import type { NextConfig } from "next";

// The signature upload goes browser -> Server Action -> backend (the session
// cookie is httpOnly, so the browser can't call the API with it directly).
// The backend accepts images up to 10MB, so both limits the request crosses
// on the way — the Server Action body (1MB by default) and proxy.ts's
// request-body buffer (10MB by default) — leave room for that plus
// multipart overhead.
const UPLOAD_BODY_LIMIT = "11mb";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_LIMIT,
    },
    proxyClientMaxBodySize: UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
