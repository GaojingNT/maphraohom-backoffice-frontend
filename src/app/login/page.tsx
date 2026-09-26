import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/constants";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ · มะพร้าวหอม Backoffice",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, expired } = await props.searchParams;

  return (
    <div className="flex min-h-dvh justify-center bg-frame">
      <div className="mk relative flex min-h-dvh w-full max-w-[430px] flex-col justify-center bg-bg px-5 py-8">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-[18px] bg-sand-500 text-ink">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-7 w-7"
          >
            <circle cx="12" cy="13" r="8" />
            <circle cx="9.5" cy="11" r="1" />
            <circle cx="14.5" cy="11" r="1" />
            <circle cx="12" cy="14.5" r="1" />
          </svg>
        </div>
        <div className="mk-eyebrow">มะพร้าวหอม · Backoffice</div>
        <h1 className="mk-h1 mt-1">เข้าสู่ระบบ</h1>
        <p className="mt-1 mb-6 text-ink-muted">
          ใช้อีเมลและรหัสผ่านของเจ้าของร้าน
        </p>
        <LoginForm
          next={safeNextPath(first(next))}
          sessionExpired={first(expired) === "1"}
        />
      </div>
    </div>
  );
}
