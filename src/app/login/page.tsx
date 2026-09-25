import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/constants";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ · มะพร้าวหอม Backoffice",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;

  return (
    <div className="flex min-h-dvh justify-center bg-frame">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-bg shadow-[0_0_0_1px_rgba(22,33,26,0.10)]">
        <div className="border-b-2 border-divider px-5 pt-[64px] pb-6">
          <div className="text-[10px] leading-none font-semibold tracking-[.18em] text-accent uppercase">
            มะพร้าวหอม · Backoffice
          </div>
          <h1 className="mt-2.5 text-[30px] leading-[1.15] font-bold tracking-[-.01em]">
            เข้าสู่ระบบ
          </h1>
          <p className="mt-2 text-[13px] leading-[1.6] text-ink/55">
            ใช้อีเมลและรหัสผ่านของเจ้าของร้าน
          </p>
        </div>
        <LoginForm next={safeNextPath(Array.isArray(next) ? next[0] : next)} />
      </div>
    </div>
  );
}
