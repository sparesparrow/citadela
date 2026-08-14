"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleIcon } from "./Icons";
import type { Dictionary } from "@/dictionaries/en";

export function GoogleSignIn({ auth, callbackUrl }: { auth: Dictionary["auth"]; callbackUrl: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-google"
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("google", { callbackUrl });
      }}
    >
      <GoogleIcon />
      <span>{pending ? auth.signingIn : auth.google}</span>
    </button>
  );
}

export function StaffSignIn({ auth, callbackUrl }: { auth: Dictionary["auth"]; callbackUrl: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const res = await signIn("staff", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      redirect: false,
    });

    if (res?.error) {
      setError(auth.invalid);
      setPending(false);
      return;
    }
    window.location.assign(callbackUrl);
  }

  return (
    <form onSubmit={onSubmit}>
      <fieldset disabled={pending}>
        <legend>{auth.adminTitle}</legend>

        <div className="field">
          <label htmlFor="staff-email">{auth.email}</label>
          <input
            id="staff-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            inputMode="email"
          />
        </div>

        <div className="field pw-wrap">
          <label htmlFor="staff-password">{auth.password}</label>
          <input
            id="staff-password"
            name="password"
            type={reveal ? "text" : "password"}
            required
            minLength={8}
            autoComplete="current-password"
          />
          <button
            className="pw-toggle"
            type="button"
            aria-pressed={reveal}
            onClick={() => setReveal((v) => !v)}
          >
            {reveal ? auth.hidePassword : auth.showPassword}
          </button>
        </div>

        <button className="btn btn-solid btn-block" type="submit" disabled={pending}>
          <span>{pending ? auth.signingIn : auth.signIn}</span>
        </button>
      </fieldset>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p className="form-status" data-tone="error">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      className="dialog-close"
      type="button"
      onClick={() => {
        void import("next-auth/react").then((m) => m.signOut({ callbackUrl: "/" }));
      }}
    >
      {label}
    </button>
  );
}
