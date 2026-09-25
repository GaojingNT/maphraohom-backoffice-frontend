"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  AuthApiError,
  authErrorMessage,
  deleteSignature,
  signIn,
  updateProfile,
  uploadSignature,
  type UpdateProfileInput,
} from "@/lib/api/auth";
import { SESSION_COOKIE, safeNextPath } from "@/lib/auth/constants";
import { requireSessionToken } from "@/lib/auth/session";

// Every action here returns { error } instead of throwing: Next.js masks
// thrown errors' messages in production, and the forms need the Thai text.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// A 401 from the backend inside an action means the session died mid-use —
// same handling as lib/auth/session.ts's getCurrentProfile.
function redirectIfUnauthorized(err: unknown) {
  if (err instanceof AuthApiError && err.status === 401) redirect("/logout");
}

export interface SignInState {
  error?: string;
  email?: string;
}

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "กรอกอีเมลและรหัสผ่าน", email };
  }

  let result;
  try {
    result = await signIn(email, password);
  } catch (err) {
    return {
      error: authErrorMessage(err, "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง"),
      email,
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: result.expiresIn,
  });

  // Outside the try/catch — redirect() works by throwing.
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  const token = await requireSessionToken();
  try {
    await updateProfile(token, {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
    });
  } catch (err) {
    redirectIfUnauthorized(err);
    return { ok: false, error: authErrorMessage(err, "บันทึกโปรไฟล์ไม่สำเร็จ") };
  }
  revalidatePath("/admin/profile");
  return { ok: true, data: undefined };
}

export async function uploadSignatureAction(
  formData: FormData,
): Promise<ActionResult<string>> {
  const token = await requireSessionToken();
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "เลือกไฟล์ลายเซ็น" };
  }
  try {
    const url = await uploadSignature(token, file);
    revalidatePath("/admin/profile");
    return { ok: true, data: url };
  } catch (err) {
    redirectIfUnauthorized(err);
    return { ok: false, error: authErrorMessage(err, "อัปโหลดลายเซ็นไม่สำเร็จ") };
  }
}

export async function deleteSignatureAction(): Promise<ActionResult> {
  const token = await requireSessionToken();
  try {
    await deleteSignature(token);
  } catch (err) {
    redirectIfUnauthorized(err);
    return { ok: false, error: authErrorMessage(err, "ลบลายเซ็นไม่สำเร็จ") };
  }
  revalidatePath("/admin/profile");
  return { ok: true, data: undefined };
}
