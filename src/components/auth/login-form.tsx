"use client";

import { useActionState } from "react";
import { ArrowRight, CircleAlert, Info } from "lucide-react";
import { signInAction, type SignInState } from "@/app/actions/auth";
import PasswordInput from "@/components/password-input";

const INITIAL_STATE: SignInState = {};

export default function LoginForm({
  next,
  sessionExpired = false,
}: {
  next: string;
  sessionExpired?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />

      {/* F2: a token that ran out mid-use used to drop the owner here with no
          explanation. */}
      {sessionExpired && !state.error && (
        <div className="mk-alert mk-alert--info mb-4">
          <Info />
          <span>
            หมดเวลาเข้าสู่ระบบ — เข้าสู่ระบบอีกครั้งแล้วจะกลับไปหน้าเดิมให้
          </span>
        </div>
      )}

      <div className="mk-field">
        <label htmlFor="login-email" className="mk-label">
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
          className="mk-input"
        />
      </div>

      <div className="mk-field">
        <label htmlFor="login-password" className="mk-label">
          รหัสผ่าน
        </label>
        <PasswordInput
          id="login-password"
          name="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error && (
        <div role="alert" className="mk-alert mk-alert--error mt-3">
          <CircleAlert />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mk-btn mk-btn--primary mk-btn--lg mk-btn--block mt-6"
      >
        {pending && <span className="mk-spin" />}
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        {!pending && <ArrowRight />}
      </button>
    </form>
  );
}
