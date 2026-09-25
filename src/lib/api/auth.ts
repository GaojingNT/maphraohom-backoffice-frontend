import { API_BASE_URL } from "@/lib/api/config";
import type { Profile } from "@/lib/types";

// Every call here takes the session token explicitly and uses plain fetch
// rather than lib/api/fetch.ts's apiFetch: these only ever run on the server
// (Server Components via lib/auth/session.ts, Server Actions via
// app/actions/auth.ts), and a 401 here doesn't always mean "session expired"
// — on sign-in it means a wrong password, which apiFetch would turn into a
// redirect to /logout.

// Thrown on a non-2xx response. `code` is the backend's error code (e.g.
// "A-3001") so callers can pick a Thai message; `status` lets the session
// helpers tell an expired/invalid token (401) apart from everything else.
export class AuthApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

async function throwAuthApiError(res: Response, fallback: string): Promise<never> {
  const body: { code?: string; message?: string } | null = await res
    .json()
    .catch(() => null);
  throw new AuthApiError(body?.message || fallback, res.status, body?.code);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// signature/store logos come back as "/api/v1/files/..." paths, used as-is
// — see the note at the top of lib/api/bills.ts. Normalized only so the
// fields are never missing.
function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    signature: profile.signature ?? "",
    stores: profile.stores ?? [],
  };
}

export interface SignInResult {
  accessToken: string;
  // Seconds until the token expires (AUTH_SESSION_LIFETIME on the backend).
  expiresIn: number;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const res = await fetch(`${API_BASE_URL}/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email, password }),
    cache: "no-store",
  });
  if (!res.ok) await throwAuthApiError(res, "เข้าสู่ระบบไม่สำเร็จ");
  const body: { accessToken: string; expiresIn: number } = await res.json();
  return { accessToken: body.accessToken, expiresIn: body.expiresIn };
}

export async function fetchProfile(token: string): Promise<Profile> {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) await throwAuthApiError(res, "GET /auth/profile failed");
  return normalizeProfile(await res.json());
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  email: string;
}

export async function updateProfile(
  token: string,
  input: UpdateProfileInput,
): Promise<Profile> {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAuthApiError(res, "บันทึกโปรไฟล์ไม่สำเร็จ");
  return normalizeProfile(await res.json());
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(
  token: string,
  input: ChangePasswordInput,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/profile/password`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwAuthApiError(res, "เปลี่ยนรหัสผ่านไม่สำเร็จ");
}

// The signature is attached/replaced/removed through its own endpoints,
// independent of updating name/email — same split as a store's logo.
export async function uploadSignature(token: string, file: File): Promise<string> {
  const form = new FormData();
  form.set("signature", file);
  const res = await fetch(`${API_BASE_URL}/auth/profile/signature`, {
    method: "PUT",
    headers: authHeaders(token),
    body: form,
  });
  if (!res.ok) await throwAuthApiError(res, "อัปโหลดลายเซ็นไม่สำเร็จ");
  const body: { signature: string } = await res.json();
  return body.signature;
}

export async function deleteSignature(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/profile/signature`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) await throwAuthApiError(res, "ลบลายเซ็นไม่สำเร็จ");
}

// Thai message for a backend error code, falling back to the given text.
export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    switch (err.code) {
      case "A-3001":
        return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      case "A-3003":
        return "อีเมลนี้มีผู้ใช้อื่นใช้อยู่แล้ว";
      case "A-3004":
        return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
      case "A-3005":
        return "รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน";
      case "T-2004":
        return "กรอกข้อมูลให้ถูกต้อง";
      case "STORE-1001":
        return "รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP";
      case "STORE-1002":
        return "ไฟล์ใหญ่เกิน 10MB";
    }
  }
  return fallback;
}
