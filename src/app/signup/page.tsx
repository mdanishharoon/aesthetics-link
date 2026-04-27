"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import CaptchaField from "@/components/CaptchaField";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { register } from "@/lib/auth/client";
import type { AccountType } from "@/types";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  clinicName: string;
  businessName: string;
  licenseNumber: string;
  taxId: string;
  website: string;
  phone: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  clinicName: "",
  businessName: "",
  licenseNumber: "",
  taxId: "",
  website: "",
  phone: "",
};

export default function SignUp() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("retail");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (response) => {
      if (response.user.accountType === "clinic") {
        const query = new URLSearchParams({ email: form.email, state: "created", clinic: "1" });
        router.push(`/verify-email?${query.toString()}`);
      } else {
        router.push("/profile");
      }
      router.refresh();
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (registerMutation.isPending) return;
    registerMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      accountType,
      marketingOptIn,
      businessInfo:
        accountType === "clinic"
          ? {
              clinicName: form.clinicName,
              businessName: form.businessName,
              licenseNumber: form.licenseNumber,
              taxId: form.taxId,
              website: form.website,
              phone: form.phone,
            }
          : undefined,
      captchaToken: captchaToken ?? undefined,
    });
  }

  const loading = registerMutation.isPending;
  const error = registerMutation.error instanceof Error ? registerMutation.error.message : null;

  return (
    <div className="auth-page shop-page">
      <MotionProvider />
      <Header />
      <main className="auth-split">
        <div className="auth-visual">
          <div className="auth-visual-text">
            <h2>Create an account.</h2>
            <p>Join AestheticsLink to discover science-backed skincare.</p>
          </div>
        </div>

        <div className="auth-content">
          <div className="auth-form-wrapper">
            <h1 className="auth-title">Sign up</h1>
            <p className="auth-subtitle">
              Create a retail account, or apply as a clinic to unlock wholesale pricing after approval.
            </p>
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
              <p>Retail accounts are active immediately.</p>
              <p style={{ marginTop: "0.35rem" }}>
                Clinic / B2B applications are reviewed by admin. Once approved, wholesale pricing is enabled on your
                account.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              <button
                type="button"
                className="auth-submit"
                style={{
                  flex: 1,
                  padding: "0.8rem 1rem",
                  opacity: accountType === "retail" ? 1 : 0.6,
                }}
                onClick={() => setAccountType("retail")}
              >
                Retail
              </button>
              <button
                type="button"
                className="auth-submit"
                style={{
                  flex: 1,
                  padding: "0.8rem 1rem",
                  opacity: accountType === "clinic" ? 1 : 0.6,
                }}
                onClick={() => setAccountType("clinic")}
              >
                Clinic / B2B
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="auth-input-group" style={{ flex: 1 }}>
                  <label className="auth-label" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    className="auth-input"
                    type="text"
                    id="firstName"
                    placeholder="First Name"
                    required
                    value={form.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                  />
                </div>
                <div className="auth-input-group" style={{ flex: 1 }}>
                  <label className="auth-label" htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    className="auth-input"
                    type="text"
                    id="lastName"
                    placeholder="Last Name"
                    required
                    value={form.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                  />
                </div>
              </div>

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
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
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
                  placeholder="Create a password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                />
              </div>

              {accountType === "clinic" ? (
                <>
                  <div className="auth-input-group">
                    <label className="auth-label" htmlFor="clinicName">
                      Clinic Name
                    </label>
                    <input
                      className="auth-input"
                      type="text"
                      id="clinicName"
                      placeholder="Clinic or Practice Name"
                      required
                      value={form.clinicName}
                      onChange={(event) => update("clinicName", event.target.value)}
                    />
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-label" htmlFor="businessName">
                      Business Legal Name
                    </label>
                    <input
                      className="auth-input"
                      type="text"
                      id="businessName"
                      placeholder="Registered Business Name"
                      required
                      value={form.businessName}
                      onChange={(event) => update("businessName", event.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="auth-input-group" style={{ flex: 1 }}>
                      <label className="auth-label" htmlFor="licenseNumber">
                        License Number
                      </label>
                      <input
                        className="auth-input"
                        type="text"
                        id="licenseNumber"
                        placeholder="Professional License"
                        required
                        value={form.licenseNumber}
                        onChange={(event) => update("licenseNumber", event.target.value)}
                      />
                    </div>
                    <div className="auth-input-group" style={{ flex: 1 }}>
                      <label className="auth-label" htmlFor="taxId">
                        Tax / VAT ID
                      </label>
                      <input
                        className="auth-input"
                        type="text"
                        id="taxId"
                        placeholder="Tax or VAT ID"
                        value={form.taxId}
                        onChange={(event) => update("taxId", event.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="auth-input-group" style={{ flex: 1 }}>
                      <label className="auth-label" htmlFor="website">
                        Website
                      </label>
                      <input
                        className="auth-input"
                        type="url"
                        id="website"
                        placeholder="https://clinic.com"
                        value={form.website}
                        onChange={(event) => update("website", event.target.value)}
                      />
                    </div>
                    <div className="auth-input-group" style={{ flex: 1 }}>
                      <label className="auth-label" htmlFor="phone">
                        Phone
                      </label>
                      <input
                        className="auth-input"
                        type="tel"
                        id="phone"
                        placeholder="+1 000 000 0000"
                        value={form.phone}
                        onChange={(event) => update("phone", event.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <CaptchaField onTokenChange={setCaptchaToken} />

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                  color: "var(--color-gray2)",
                  fontSize: "0.86rem",
                  lineHeight: 1.45,
                }}
              >
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                  style={{ accentColor: "var(--color-text)", marginTop: "0.15rem" }}
                />
                <span>Email me product updates, offers, and educational content.</span>
              </label>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Creating account..." : accountType === "clinic" ? "Submit Application" : "Create Account"}
              </button>
            </form>

            {error ? <p style={{ marginTop: "1rem", color: "#b04545", fontSize: "0.85rem" }}>{error}</p> : null}

            <div className="auth-footer">
              Already have an account?{" "}
              <Link href="/login" className="auth-link">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
