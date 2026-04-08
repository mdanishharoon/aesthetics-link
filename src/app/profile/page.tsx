"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { getMe, logout } from "@/lib/auth/client";
import type { AuthUser } from "@/lib/auth/types";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="auth-page shop-page" style={{ paddingTop: "8rem", textAlign: "center" }}>Loading...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const state = searchParams.get("state");

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const response = await getMe();
        setUser(response.user);
      } catch (authError) {
        setUser(null);
        setError(authError instanceof Error ? authError.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  async function handleLogout(): Promise<void> {
    if (logoutBusy) {
      return;
    }

    setLogoutBusy(true);
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Unable to log out.");
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <div className="auth-page shop-page">
      <MotionProvider />
      <Header />

      <main className="container" style={{ paddingTop: "11rem", paddingBottom: "6rem" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>My Profile</h1>

          {loading ? <p style={{ color: "var(--color-gray2)" }}>Loading profile...</p> : null}

          {!loading && state === "signup-success" ? (
            <div
              style={{
                marginTop: "1rem",
                border: "1px solid rgba(0,0,0,0.08)",
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                color: "var(--color-gray2)",
                fontSize: "0.85rem",
              }}
            >
              Account created successfully. You can continue shopping or proceed to checkout.
            </div>
          ) : null}

          {!loading && state === "clinic-pending" ? (
            <div
              style={{
                marginTop: "1rem",
                border: "1px solid rgba(0,0,0,0.08)",
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                color: "var(--color-gray2)",
                fontSize: "0.85rem",
              }}
            >
              Clinic application submitted. Status is pending admin review. You can keep using your account while
              approval is in progress.
            </div>
          ) : null}

          {!loading && !user ? (
            <div style={{ marginTop: "2rem", border: "1px solid rgba(0,0,0,0.08)", padding: "1.5rem", borderRadius: "12px" }}>
              <p style={{ marginBottom: "1rem" }}>
                {error ?? "You are not logged in."}
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link href="/login" className="btn">
                  Log in
                </Link>
                <Link href="/signup" className="btn" style={{ background: "transparent", color: "var(--color-text)" }}>
                  Create account
                </Link>
              </div>
            </div>
          ) : null}

          {user ? (
            <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
              <div style={{ border: "1px solid rgba(0,0,0,0.08)", padding: "1.25rem", borderRadius: "12px" }}>
                <p style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.65 }}>
                  Account
                </p>
                <h2 style={{ marginTop: "0.4rem" }}>
                  {user.firstName} {user.lastName}
                </h2>
                <p style={{ marginTop: "0.3rem", color: "var(--color-gray2)" }}>{user.email}</p>
                <p style={{ marginTop: "0.6rem", color: "var(--color-gray2)" }}>
                  Type: <strong>{user.accountType === "clinic" ? "Clinic / B2B" : "Retail"}</strong>
                </p>
                <p style={{ marginTop: "0.2rem", color: "var(--color-gray2)" }}>
                  Role: <strong>{user.role}</strong>
                </p>
                <p style={{ marginTop: "0.2rem", color: "var(--color-gray2)" }}>
                  Email Verified: <strong>{user.emailVerified ? "Yes" : "No"}</strong>
                </p>
              </div>

              {user.accountType === "clinic" ? (
                <div style={{ border: "1px solid rgba(0,0,0,0.08)", padding: "1.25rem", borderRadius: "12px" }}>
                  <p style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.65 }}>
                    Clinic Status
                  </p>
                  <h3 style={{ marginTop: "0.4rem", textTransform: "capitalize" }}>
                    {user.clinicStatus ?? "pending"}
                  </h3>
                  <p style={{ marginTop: "0.5rem", color: "var(--color-gray2)" }}>
                    {user.clinicStatus === "approved"
                      ? "Your clinic account is approved. Wholesale pricing is now available."
                      : user.clinicStatus === "rejected"
                        ? "Your clinic application was rejected. Contact support for review."
                        : "Your clinic application is pending admin review."}
                  </p>
                  <ol style={{ marginTop: "0.8rem", paddingLeft: "1rem", color: "var(--color-gray2)" }}>
                    <li>Submit clinic details at signup.</li>
                    <li>Admin reviews your business information in WordPress.</li>
                    <li>If approved, your account gets wholesale role/pricing access.</li>
                  </ol>
                </div>
              ) : null}

              {user.businessInfo && Object.values(user.businessInfo).some(Boolean) ? (
                <div style={{ border: "1px solid rgba(0,0,0,0.08)", padding: "1.25rem", borderRadius: "12px" }}>
                  <p style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.65 }}>
                    Business Details
                  </p>
                  <ul style={{ marginTop: "0.8rem", display: "grid", gap: "0.35rem", paddingLeft: "1rem" }}>
                    {user.businessInfo.clinicName ? <li>Clinic: {user.businessInfo.clinicName}</li> : null}
                    {user.businessInfo.businessName ? <li>Business: {user.businessInfo.businessName}</li> : null}
                    {user.businessInfo.licenseNumber ? <li>License: {user.businessInfo.licenseNumber}</li> : null}
                    {user.businessInfo.taxId ? <li>Tax/VAT: {user.businessInfo.taxId}</li> : null}
                    {user.businessInfo.website ? <li>Website: {user.businessInfo.website}</li> : null}
                    {user.businessInfo.phone ? <li>Phone: {user.businessInfo.phone}</li> : null}
                  </ul>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem" }}>
                <Link href="/products" className="btn">
                  Continue Shopping
                </Link>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void handleLogout()}
                  disabled={logoutBusy}
                  style={{ background: "transparent", color: "var(--color-text)" }}
                >
                  {logoutBusy ? "Signing out..." : "Log out"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
