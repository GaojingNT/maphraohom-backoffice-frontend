"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signInAction, type SignInState } from "@/app/actions/auth";

const INITIAL_STATE: SignInState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-[22px] border-b-2 border-divider bg-surface p-5"
    >
      <input type="hidden" name="next" value={next} />

      <div>
        <label
          htmlFor="login-email"
          className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
        >
          อีเมล
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          defaultValue={state.email}
          placeholder="name@example.com"
          className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-2.5 block text-[10px] font-semibold tracking-[.13em] text-ink/55 uppercase"
        >
          รหัสผ่าน
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-12 w-full border border-divider bg-bg px-[13px] text-[15px] outline-none"
        />
      </div>

      {state.error && (
        <div
          role="alert"
          className="border border-danger/40 bg-danger/5 px-[13px] py-2.5 text-[13px] leading-[1.5] text-danger"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-[52px] items-center justify-center gap-2 bg-accent px-4 text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        <ArrowRight size={17} className="ml-auto" />
      </button>
    </form>
  );
}
