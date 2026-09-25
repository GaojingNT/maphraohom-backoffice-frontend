import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/api/config";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Same-origin gateway to the backend for the browser — see lib/api/fetch.ts.
// The browser sends the httpOnly session cookie here; this attaches it as a
// Bearer token and forwards the request. Also serves every file URL the
// backend hands out (/api/v1/files/...: slips, logos, signatures), so <img>
// tags load them with the session too.

// Request headers worth passing through — never the cookie itself.
const FORWARD_REQUEST_HEADERS = ["accept", "content-type"];
// Response headers worth passing back.
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "cache-control",
  "etag",
  "last-modified",
];

async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;

  // Each segment is re-encoded, and "."/".." are refused, so a crafted URL
  // can't climb out of /api/v1 into the backend's other (non-API) routes.
  if (path.some((s) => s === "." || s === ".." || s === "")) {
    return Response.json({ code: "S-404", message: "not found" }, { status: 404 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return Response.json({ code: "T-1001", message: "unauthorized" }, { status: 401 });
  }

  const target = `${API_BASE_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers({ Authorization: `Bearer ${token}` });
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
