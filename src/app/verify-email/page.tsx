"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import CaptchaField from "@/components/CaptchaField";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { requestEmailVerification, verifyEmail } from "@/lib/auth/client";

type VerifyState = "idle" | "verifying" | "verified" | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="auth-page shop-page" style={{ paddingTop: "8rem", textAlign: "center" }}>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>(token ? "verifying" : "idle");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const didAutoVerifyRef = useRef(false);

  useEffect(() => {
    if (!token || didAutoVerifyRef.current) {
      return;
    }

    didAutoVerifyRef.current = true;
    setVerifyState("verifying");
    setVerifyMessage(null);

    void verifyEmail({ token })
      .then((response) => {
        setVerifyState("verified");
        setVerifyMessage(response.message ?? "Email verified successfully.");
      })
      .catch((error: unknown) => {
        setVerifyState("error");
        setVerifyMessage(error instanceof Error ? error.message : "Unable to verify email.");
      });
  }, [token]);

  const createdState = searchParams.get("state") === "created";
  const clinicState = searchParams.get("clinic") === "1";

  const helperText = useMemo(() => {
    if (!createdState) {
      return null;
    }

    if (clinicState) {
      return "Clinic application received. Verify your email to activate login, then track approval in your profile.";
    }

    return "Account created. Verify your email to activate login and checkout.";
  }, [clinicState, createdState]);

  async function handleResend(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (resendBusy) {
      return;
    }

    setResendBusy(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const response = await requestEmailVerification({
        email,
        captchaToken: captchaToken ?? undefined,
      });
      setResendMessage(response.message ?? "Verification email request submitted.");
    } catch (error) {
      setResendError(error instanceof Error ? error.message : "Unable to send verification email.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div className="auth-page shop-page">
      <MotionProvider />
      <Header />
      <main className="auth-split">
        <div className="auth-visual">
          <div className="auth-visual-text">
            <h2>Verify your email.</h2>
            <p>Secure account activation is required before first login.</p>
          </div>
        </div>

        <div className="auth-content">
          <div className="auth-form-wrapper">
            <h1 className="auth-title">Email Verification</h1>
            <p className="auth-subtitle">Use the link in your inbox, or request a new one.</p>

            {helperText ? (
              <div
                style={{
                  marginBottom: "1rem",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "12px",
                  padding: "0.85rem 0.95rem",
                  color: "var(--color-gray2)",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                }}
              >
                {helperText}
              </div>
            ) : null}

            {token ? (
              <div
                style={{
                  marginBottom: "1rem",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "12px",
                  padding: "0.85rem 0.95rem",
                  color: "var(--color-gray2)",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                }}
              >
                {verifyState === "verifying" ? "Verifying link..." : verifyMessage}
              </div>
            ) : null}

            {verifyState === "verified" ? (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Link href="/profile" className="btn">
                  Open Profile
                </Link>
                <Link href="/products" className="btn" style={{ background: "transparent", color: "var(--color-text)" }}>
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <form className="auth-form" onSubmit={handleResend}>
                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="verifyEmail">
                    Email
                  </label>
                  <input
                    className="auth-input"
                    type="email"
                    id="verifyEmail"
                    placeholder="Email address"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <CaptchaField onTokenChange={setCaptchaToken} />

                <button type="submit" className="auth-submit" disabled={resendBusy}>
                  {resendBusy ? "Sending..." : "Resend verification email"}
                </button>
              </form>
            )}

            {resendMessage ? <p style={{ marginTop: "0.8rem", color: "var(--color-gray2)", fontSize: "0.85rem" }}>{resendMessage}</p> : null}
            {resendError ? <p style={{ marginTop: "0.8rem", color: "#b04545", fontSize: "0.85rem" }}>{resendError}</p> : null}

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
