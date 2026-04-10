"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CaptchaField from "@/components/CaptchaField";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { AuthApiError, login } from "@/lib/auth/client";
import type { AuthUser } from "@/lib/auth/types";

export default function Login() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [needsVerificationForEmail, setNeedsVerificationForEmail] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      queryClient.setQueryData<AuthUser | null>(["auth", "me"], response.user);
      router.push("/profile");
      router.refresh();
    },
    onError: (error) => {
      if (error instanceof AuthApiError && error.code === "email_not_verified") {
        setNeedsVerificationForEmail(email);
      }
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (loginMutation.isPending) return;
    setNeedsVerificationForEmail(null);
    loginMutation.mutate({ email, password, captchaToken: captchaToken ?? undefined });
  }

  const loading = loginMutation.isPending;
  const error = loginMutation.error instanceof Error ? loginMutation.error.message : null;

  return (
    <div className="auth-page shop-page">
      <MotionProvider />
      <Header />
      <main className="auth-split">
        <div className="auth-visual">
          <div className="auth-visual-text">
            <h2>Welcome back.</h2>
            <p>Your journey to radical aesthetics continues.</p>
          </div>
        </div>

        <div className="auth-content">
          <div className="auth-form-wrapper">
            <h1 className="auth-title">Log in</h1>
            <p className="auth-subtitle">Enter your details to access your account.</p>
            <div
              style={{
                marginBottom: "1rem",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "12px",
                padding: "0.85rem 0.95rem",
                background: "rgba(255,255,255,0.65)",
                color: "var(--color-gray2)",
                fontSize: "0.82rem",
                lineHeight: 1.5,
              }}
            >
              <p>
                Retail accounts can sign in right away. Clinic / B2B accounts must verify email before first login.
                If your password is lost, use{" "}
                <Link href="/forgot-password" className="auth-link">
                  reset password
                </Link>
                .
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="email">
                  Email
                </label>
                <input
                  className="auth-input"
                  type="email"
                  id="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="password">
                  Password
                </label>
                <input
                  className="auth-input"
                  type="password"
                  id="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="auth-options">
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--color-text)" }} />
                  Remember me
                </label>
                <Link href="/forgot-password" className="auth-link">
                  Forgot password?
                </Link>
              </div>

              <CaptchaField onTokenChange={setCaptchaToken} />

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {error ? <p style={{ marginTop: "1rem", color: "#b04545", fontSize: "0.85rem" }}>{error}</p> : null}
            {needsVerificationForEmail ? (
              <p style={{ marginTop: "0.55rem", color: "var(--color-gray2)", fontSize: "0.85rem" }}>
                This account requires email verification first.{" "}
                <Link href={`/verify-email?email=${encodeURIComponent(needsVerificationForEmail)}`} className="auth-link">
                  Resend verification email
                </Link>
              </p>
            ) : null}

            <div className="auth-footer">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="auth-link">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
