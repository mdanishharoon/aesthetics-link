"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import CaptchaField from "@/components/CaptchaField";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { resetPassword } from "@/lib/auth/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page shop-page" style={{ paddingTop: "8rem", textAlign: "center" }}>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenMissing = useMemo(() => token.trim().length === 0, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loading || tokenMissing) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await resetPassword({
        token,
        password,
        captchaToken: captchaToken ?? undefined,
      });
      setMessage(response.message ?? "Password reset completed. You can sign in now.");
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page shop-page">
      <MotionProvider />
      <Header />
      <main className="auth-split">
        <div className="auth-visual">
          <div className="auth-visual-text">
            <h2>Create a new password.</h2>
            <p>Use a strong password with at least 8 characters.</p>
          </div>
        </div>

        <div className="auth-content">
          <div className="auth-form-wrapper">
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter and confirm your new password.</p>

            {tokenMissing ? (
              <div
                style={{
                  marginBottom: "1rem",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "12px",
                  padding: "0.85rem 0.95rem",
                  color: "#b04545",
                  fontSize: "0.82rem",
                }}
              >
                Reset token is missing. Request a new reset link.
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  className="auth-input"
                  type="password"
                  id="newPassword"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  className="auth-input"
                  type="password"
                  id="confirmPassword"
                  placeholder="Repeat password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              <CaptchaField onTokenChange={setCaptchaToken} />

              <button type="submit" className="auth-submit" disabled={loading || tokenMissing}>
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>

            {message ? <p style={{ marginTop: "0.8rem", color: "var(--color-gray2)", fontSize: "0.85rem" }}>{message}</p> : null}
            {error ? <p style={{ marginTop: "0.8rem", color: "#b04545", fontSize: "0.85rem" }}>{error}</p> : null}

            <div className="auth-footer">
              Back to{" "}
              <Link href="/login" className="auth-link">
                Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
