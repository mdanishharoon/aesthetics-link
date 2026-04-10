"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { getMe, getOrders, logout } from "@/lib/auth/client";
import type { AuthOrderSummary, AuthUser } from "@/lib/auth/types";

const ORDER_FETCH_LIMIT = 12;

function getOrderStatusTone(status: string): string {
  if (status === "completed") return "complete";
  if (status === "processing" || status === "on-hold") return "active";
  if (status === "cancelled" || status === "failed" || status === "refunded") return "inactive";
  return "pending";
}

function formatAccountLabel(user: AuthUser): string {
  return user.accountType === "clinic" ? "Clinic account" : "Retail account";
}

function formatClinicMessage(user: AuthUser): string | null {
  if (user.accountType !== "clinic") {
    return null;
  }

  if (user.clinicStatus === "approved") {
    return "Business account approved. Wholesale pricing is active.";
  }

  if (user.clinicStatus === "rejected") {
    return "Business account not approved. Contact support if you need a review.";
  }

  return "Business account under review. Retail ordering remains available meanwhile.";
}

function buildOrderPreview(order: AuthOrderSummary): string {
  const parts = order.previewItems.map((item) => `${item.name} x${item.quantity}`);
  if (parts.length === 0) {
    return `${order.itemCount} order line${order.itemCount === 1 ? "" : "s"}`;
  }
  return parts.join(" • ");
}

function ProfileBanner({ children }: { children: ReactNode }) {
  return <div className="profile-dashboard__banner">{children}</div>;
}

function SignedOutState({ error }: { error: string | null }) {
  return (
    <section className="profile-dashboard__auth">
      <div className="profile-dashboard__eyebrow">Account Access</div>
      <h2 className="profile-dashboard__section-title">Sign in to review your account and orders.</h2>
      <p className="profile-dashboard__copy">
        {error ?? "This area is available to signed-in customers only."}
      </p>
      <div className="profile-dashboard__action-row">
        <Link href="/login" className="profile-dashboard__button">
          Log in
        </Link>
        <Link href="/signup" className="profile-dashboard__button profile-dashboard__button--secondary">
          Create account
        </Link>
      </div>
    </section>
  );
}

function OrdersEmptyState() {
  return (
    <div className="profile-orders__empty">
      <div className="profile-dashboard__eyebrow">Orders</div>
      <h3 className="profile-dashboard__section-title">No orders recorded yet.</h3>
      <p className="profile-dashboard__copy">
        Once you place an order, it will appear here with status, totals, and access to the formal receipt.
      </p>
      <Link href="/products" className="profile-dashboard__button">
        Start shopping
      </Link>
    </div>
  );
}

function OrdersErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="profile-orders__empty">
      <div className="profile-dashboard__eyebrow">Orders</div>
      <h3 className="profile-dashboard__section-title">Orders could not be loaded.</h3>
      <p className="profile-dashboard__copy">{message}</p>
      <button type="button" className="profile-dashboard__button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function OrdersSection({
  orders,
  loading,
  error,
  onRetry,
}: {
  orders: AuthOrderSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const latestOrder = orders[0];

  return (
    <section className="profile-orders" aria-labelledby="profile-orders-title">
      <div className="profile-orders__header">
        <div>
          <div className="profile-dashboard__eyebrow">Orders</div>
          <h2 id="profile-orders-title" className="profile-dashboard__section-title">
            Order history and receipts
          </h2>
        </div>
        <div className="profile-orders__summary">
          <span>{orders.length} shown</span>
          <strong>{latestOrder ? `Latest: ${latestOrder.createdAt}` : "No orders yet"}</strong>
        </div>
      </div>

      {loading ? (
        <div className="profile-orders__loading">Loading your recent orders...</div>
      ) : error ? (
        <OrdersErrorState message={error} onRetry={onRetry} />
      ) : orders.length === 0 ? (
        <OrdersEmptyState />
      ) : (
        <div className="profile-orders__table" role="table" aria-label="Recent orders">
          <div className="profile-orders__head" role="row">
            <span role="columnheader">Order</span>
            <span role="columnheader">Placed</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Total</span>
            <span role="columnheader">Receipt</span>
          </div>

          <div className="profile-orders__body">
            {orders.map((order) => {
              const tone = getOrderStatusTone(order.status);
              return (
                <article key={order.orderId} className="profile-orders__row" role="row">
                  <div className="profile-orders__primary" role="cell">
                    <div className="profile-orders__order-number">Order #{order.orderNumber}</div>
                    <p className="profile-orders__preview">{buildOrderPreview(order)}</p>
                    {order.paymentMethod ? (
                      <p className="profile-orders__meta">{order.paymentMethod}</p>
                    ) : null}
                  </div>

                  <div className="profile-orders__secondary" role="cell">
                    <span className="profile-orders__mobile-label">Placed</span>
                    <strong>{order.createdAt}</strong>
                  </div>

                  <div className="profile-orders__secondary" role="cell">
                    <span className="profile-orders__mobile-label">Status</span>
                    <span className={`profile-orders__status profile-orders__status--${tone}`}>
                      {order.statusLabel}
                    </span>
                  </div>

                  <div className="profile-orders__secondary" role="cell">
                    <span className="profile-orders__mobile-label">Total</span>
                    <strong>{order.total}</strong>
                  </div>

                  <div className="profile-orders__actions" role="cell">
                    {order.hasReceipt ? (
                      <Link
                        href={`/api/orders/receipt?receipt=${encodeURIComponent(order.receiptToken)}`}
                        className="profile-dashboard__button profile-dashboard__button--secondary"
                      >
                        View receipt
                      </Link>
                    ) : (
                      <span className="profile-orders__meta">Receipt unavailable</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function ProfileDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<AuthOrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const state = searchParams.get("state");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOrdersError(null);

    try {
      const me = await getMe();
      setUser(me.user);

      try {
        const ordersResponse = await getOrders(ORDER_FETCH_LIMIT);
        setOrders(ordersResponse.orders ?? []);
      } catch (ordersLoadError) {
        setOrders([]);
        setOrdersError(
          ordersLoadError instanceof Error ? ordersLoadError.message : "Unable to load your order history.",
        );
      }
    } catch (authError) {
      setUser(null);
      setOrders([]);
      setError(authError instanceof Error ? authError.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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

  const dashboardTitle = user ? `${user.firstName || "Customer"} account dashboard` : "Account dashboard";
  const clinicMessage = user ? formatClinicMessage(user) : null;
  const memberLabel = user ? formatAccountLabel(user) : null;
  const totalOrdersLabel = useMemo(() => `${orders.length} recent order${orders.length === 1 ? "" : "s"}`, [orders]);

  return (
    <div className="auth-page shop-page profile-page">
      <MotionProvider />
      <Header />

      <main className="container profile-main">
        <div className="profile-dashboard">
          <header className="profile-dashboard__hero">
            <div className="profile-dashboard__hero-copy">
              <p className="profile-dashboard__eyebrow">Account</p>
              <h1 className="profile-dashboard__title">{dashboardTitle}</h1>
              <p className="profile-dashboard__subtitle">
                Review account details, track recent orders, and reopen formal receipts without searching your inbox.
              </p>
            </div>

            <div className="profile-dashboard__hero-note">
              <span>{user ? memberLabel : "Guest access"}</span>
              <strong>{user ? totalOrdersLabel : "Sign in required"}</strong>
            </div>
          </header>

          {loading ? <p className="profile-dashboard__loading">Loading account dashboard...</p> : null}

          {!loading && state === "signup-success" ? (
            <ProfileBanner>Account created successfully. Your dashboard is ready whenever you want to continue.</ProfileBanner>
          ) : null}

          {!loading && state === "clinic-pending" ? (
            <ProfileBanner>Business application received. Approval updates will appear in your account status.</ProfileBanner>
          ) : null}

          {!loading && !user ? (
            <SignedOutState error={error} />
          ) : null}

          {user ? (
            <div className="profile-dashboard__layout">
              <aside className="profile-rail">
                <section className="profile-rail__panel profile-identity">
                  <div className="profile-identity__mark" aria-hidden="true">
                    {(user.firstName?.[0] ?? "").toUpperCase()}
                    {(user.lastName?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="profile-dashboard__eyebrow">Account holder</div>
                  <h2 className="profile-dashboard__section-title">
                    {user.displayName || `${user.firstName} ${user.lastName}`.trim() || "Customer"}
                  </h2>
                  <dl className="profile-identity__facts">
                    <div>
                      <dt>Email</dt>
                      <dd>{user.email}</dd>
                    </div>
                    <div>
                      <dt>Member type</dt>
                      <dd>{memberLabel}</dd>
                    </div>
                    {user.accountType === "clinic" ? (
                      <div>
                        <dt>Business status</dt>
                        <dd>{user.clinicStatus === "approved" ? "Approved" : user.clinicStatus === "rejected" ? "Not approved" : "Pending review"}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                {clinicMessage ? (
                  <section className="profile-rail__panel profile-rail__panel--status">
                    <div className="profile-dashboard__eyebrow">Business account</div>
                    <p className="profile-dashboard__copy">{clinicMessage}</p>
                    {user.businessInfo?.businessName || user.businessInfo?.clinicName ? (
                      <p className="profile-dashboard__copy profile-dashboard__copy--compact">
                        Registered as {user.businessInfo.businessName || user.businessInfo.clinicName}.
                      </p>
                    ) : null}
                  </section>
                ) : null}

                <section className="profile-rail__panel profile-rail__panel--actions">
                  <div className="profile-dashboard__eyebrow">Account actions</div>
                  <div className="profile-dashboard__stack">
                    <Link href="/products" className="profile-dashboard__button">
                      Continue shopping
                    </Link>
                    <Link href="/cart" className="profile-dashboard__button profile-dashboard__button--secondary">
                      View bag
                    </Link>
                    <Link
                      href="/forgot-password"
                      className="profile-dashboard__button profile-dashboard__button--secondary"
                    >
                      Reset password
                    </Link>
                    <button
                      type="button"
                      className="profile-dashboard__button profile-dashboard__button--secondary"
                      onClick={() => void handleLogout()}
                      disabled={logoutBusy}
                    >
                      {logoutBusy ? "Signing out..." : "Log out"}
                    </button>
                  </div>
                </section>
              </aside>

              <div className="profile-dashboard__content">
                <OrdersSection orders={orders} loading={loading} error={ordersError} onRetry={() => void loadProfile()} />
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page shop-page profile-page">
          <main className="container profile-main">
            <p className="profile-dashboard__loading profile-dashboard__loading--shell">Loading account dashboard...</p>
          </main>
        </div>
      }
    >
      <ProfileDashboard />
    </Suspense>
  );
}
