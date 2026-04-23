"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useMemo, useState } from "react";

import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { getAccountDashboard, getOrderDetail, logout, updateProfile } from "@/lib/auth/client";
import type {
  AuthAddress,
  AuthDashboardResponse,
  AuthOrderSummary,
  AuthUser,
  BusinessInfo,
  UpdateProfilePayload,
} from "@/lib/auth/types";
import type { StorefrontOrderAddress, StorefrontOrderConfirmation } from "@/lib/storefront/types";

const ORDER_FETCH_LIMIT = 12;
const EMPTY_ORDERS: AuthOrderSummary[] = [];

type SettingsFormState = {
  firstName: string;
  lastName: string;
  displayName: string;
  businessInfo: BusinessInfo;
  billingAddress: AuthAddress;
  shippingAddress: AuthAddress;
};

function emptyAddress(email = ""): AuthAddress {
  return {
    firstName: "",
    lastName: "",
    name: "",
    company: "",
    phone: "",
    email,
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    lines: [],
  };
}

function toEditableAddress(address: AuthAddress | undefined, fallbackEmail = ""): AuthAddress {
  const safe = address ?? emptyAddress(fallbackEmail);
  return {
    ...safe,
    email: safe.email || fallbackEmail,
    lines: Array.isArray(safe.lines) ? safe.lines : [],
  };
}

function toSettingsState(user: AuthUser): SettingsFormState {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    displayName: user.displayName ?? "",
    businessInfo: {
      clinicName: user.businessInfo?.clinicName ?? "",
      businessName: user.businessInfo?.businessName ?? "",
      licenseNumber: user.businessInfo?.licenseNumber ?? "",
      taxId: user.businessInfo?.taxId ?? "",
      website: user.businessInfo?.website ?? "",
      phone: user.businessInfo?.phone ?? "",
    },
    billingAddress: toEditableAddress(user.billingAddress, user.email),
    shippingAddress: toEditableAddress(user.shippingAddress, ""),
  };
}

function toPayloadAddress(address: AuthAddress): AuthAddress {
  return {
    ...address,
    name: "",
    lines: [],
  };
}

function createEmptySettingsState(): SettingsFormState {
  return {
    firstName: "",
    lastName: "",
    displayName: "",
    businessInfo: {},
    billingAddress: emptyAddress(),
    shippingAddress: emptyAddress(),
  };
}

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
        <Link href="/order-lookup" className="profile-dashboard__button profile-dashboard__button--secondary">
          Find guest order
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
      <div className="profile-dashboard__action-row">
        <Link href="/products" className="profile-dashboard__button">
          Start shopping
        </Link>
      </div>
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

function OrderAddressBlock({
  label,
  address,
}: {
  label: string;
  address: StorefrontOrderAddress;
}) {
  const lines = address.lines.filter(Boolean);
  return (
    <section className="profile-order-detail__address">
      <div className="profile-dashboard__eyebrow">{label}</div>
      {address.name ? <p className="profile-order-detail__address-name">{address.name}</p> : null}
      {lines.map((line) => (
        <p key={`${label}:${line}`}>{line}</p>
      ))}
      {address.email ? <p>{address.email}</p> : null}
      {address.phone ? <p>{address.phone}</p> : null}
    </section>
  );
}

function OrderDetailPanel({
  order,
  summary,
  loading,
  error,
  onRetry,
}: {
  order: StorefrontOrderConfirmation | null;
  summary: AuthOrderSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="profile-order-detail">
      <div className="profile-order-detail__header">
        <div>
          <div className="profile-dashboard__eyebrow">Selected order</div>
          <h3 className="profile-dashboard__section-title">Order detail</h3>
        </div>
        {summary?.hasReceipt ? (
          <Link
            href={`/api/orders/receipt?receipt=${encodeURIComponent(summary.receiptToken)}`}
            className="profile-dashboard__button profile-dashboard__button--secondary"
          >
            Open receipt
          </Link>
        ) : null}
      </div>

      {loading ? <p className="profile-orders__loading">Loading order detail...</p> : null}
      {!loading && error ? (
        <div className="profile-orders__empty">
          <p className="profile-dashboard__copy">{error}</p>
          <button type="button" className="profile-dashboard__button" onClick={onRetry}>
            Retry detail
          </button>
        </div>
      ) : null}

      {!loading && !error && order ? (
        <div className="profile-order-detail__content">
          <div className="profile-order-detail__meta">
            <div>
              <span>Order</span>
              <strong>#{order.orderNumber}</strong>
            </div>
            <div>
              <span>Placed</span>
              <strong>{order.createdAt}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{order.statusLabel}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{order.totals.total}</strong>
            </div>
          </div>

          <div className="profile-order-detail__items">
            {order.items.map((item) => (
              <article key={`${item.id}:${item.variationId}:${item.name}`} className="profile-order-detail__item">
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    Qty {item.quantity}
                    {item.sku ? ` • SKU ${item.sku}` : ""}
                  </p>
                  {item.meta.length > 0 ? (
                    <p>{item.meta.map((meta) => `${meta.label}: ${meta.value}`).join(" • ")}</p>
                  ) : null}
                </div>
                <strong>{item.lineTotal}</strong>
              </article>
            ))}
          </div>

          <div className="profile-order-detail__footer">
            <div className="profile-order-detail__addresses">
              <OrderAddressBlock
                label="Delivery address"
                address={order.shippingAddress.lines.length > 0 ? order.shippingAddress : order.billingAddress}
              />
              <OrderAddressBlock label="Billing address" address={order.billingAddress} />
            </div>

            <div className="profile-order-detail__totals">
              <div>
                <span>Subtotal</span>
                <strong>{order.totals.subtotal}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{order.totals.shipping}</strong>
              </div>
              <div>
                <span>Tax</span>
                <strong>{order.totals.tax}</strong>
              </div>
              <div className="profile-order-detail__grand-total">
                <span>Total</span>
                <strong>{order.totals.total}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AccountSettingsSection({
  user,
  form,
  busy,
  message,
  error,
  onFieldChange,
  onBusinessFieldChange,
  onSubmit,
}: {
  user: AuthUser;
  form: SettingsFormState;
  busy: boolean;
  message: string | null;
  error: string | null;
  onFieldChange: (field: keyof Pick<SettingsFormState, "firstName" | "lastName" | "displayName">, value: string) => void;
  onBusinessFieldChange: (field: keyof BusinessInfo, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="profile-settings">
      <div className="profile-settings__header">
        <div>
          <div className="profile-dashboard__eyebrow">Account settings</div>
          <h2 className="profile-dashboard__section-title">Name and contact details</h2>
        </div>
        <button type="button" className="profile-dashboard__button" onClick={onSubmit} disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
      </div>

      {message ? <div className="profile-dashboard__banner">{message}</div> : null}
      {error ? <div className="profile-dashboard__banner profile-dashboard__banner--error">{error}</div> : null}

      <div className="profile-settings__fields profile-settings__fields--flat">
        <label className="profile-settings__field">
          <span>First name</span>
          <input value={form.firstName} onChange={(event) => onFieldChange("firstName", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>Last name</span>
          <input value={form.lastName} onChange={(event) => onFieldChange("lastName", event.target.value)} />
        </label>
        <label className="profile-settings__field profile-settings__field--wide">
          <span>Display name</span>
          <input value={form.displayName} onChange={(event) => onFieldChange("displayName", event.target.value)} />
        </label>
        <label className="profile-settings__field profile-settings__field--wide">
          <span>Account email</span>
          <input value={user.email} disabled readOnly />
        </label>
      </div>

      {user.accountType === "clinic" ? (
        <div className="profile-settings__business">
          <div className="profile-dashboard__eyebrow">Business information</div>
          <div className="profile-settings__fields profile-settings__fields--flat">
            <label className="profile-settings__field">
              <span>Clinic name</span>
              <input
                value={form.businessInfo.clinicName ?? ""}
                onChange={(event) => onBusinessFieldChange("clinicName", event.target.value)}
              />
            </label>
            <label className="profile-settings__field">
              <span>Business name</span>
              <input
                value={form.businessInfo.businessName ?? ""}
                onChange={(event) => onBusinessFieldChange("businessName", event.target.value)}
              />
            </label>
            <label className="profile-settings__field">
              <span>Business phone</span>
              <input
                value={form.businessInfo.phone ?? ""}
                onChange={(event) => onBusinessFieldChange("phone", event.target.value)}
              />
            </label>
            <label className="profile-settings__field">
              <span>Website</span>
              <input
                value={form.businessInfo.website ?? ""}
                onChange={(event) => onBusinessFieldChange("website", event.target.value)}
              />
            </label>
            <label className="profile-settings__field">
              <span>License number</span>
              <input
                value={form.businessInfo.licenseNumber ?? ""}
                onChange={(event) => onBusinessFieldChange("licenseNumber", event.target.value)}
              />
            </label>
            <label className="profile-settings__field">
              <span>Tax ID</span>
              <input
                value={form.businessInfo.taxId ?? ""}
                onChange={(event) => onBusinessFieldChange("taxId", event.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OrdersSection({
  orders,
  loading,
  error,
  selectedOrderId,
  onRetry,
  onSelectOrder,
}: {
  orders: AuthOrderSummary[];
  loading: boolean;
  error: string | null;
  selectedOrderId: number | null;
  onRetry: () => void;
  onSelectOrder: (orderId: number) => void;
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
            <span role="columnheader">Actions</span>
          </div>

          <div className="profile-orders__body">
            {orders.map((order) => {
              const tone = getOrderStatusTone(order.status);
              const selected = selectedOrderId === order.orderId;
              return (
                <article
                  key={order.orderId}
                  className={`profile-orders__row${selected ? " is-selected" : ""}`}
                  role="row"
                >
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
                    <button
                      type="button"
                      className="profile-dashboard__button profile-dashboard__button--secondary"
                      onClick={() => onSelectOrder(order.orderId)}
                    >
                      {selected ? "Viewing" : "View details"}
                    </button>
                    {order.hasReceipt ? (
                      <Link
                        href={`/api/orders/receipt?receipt=${encodeURIComponent(order.receiptToken)}`}
                        className="profile-dashboard__button profile-dashboard__button--secondary"
                      >
                        Receipt
                      </Link>
                    ) : null}
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
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const state = searchParams.get("state");

  const dashboardQuery = useQuery<AuthDashboardResponse>({
    queryKey: ["auth", "dashboard", ORDER_FETCH_LIMIT],
    queryFn: () => getAccountDashboard(ORDER_FETCH_LIMIT),
  });

  const user = dashboardQuery.data?.user ?? null;
  const orders = dashboardQuery.data?.orders ?? EMPTY_ORDERS;
  const effectiveSelectedOrderId =
    selectedOrderId && orders.some((order) => order.orderId === selectedOrderId)
      ? selectedOrderId
      : orders[0]?.orderId ?? null;
  const resolvedForm = useMemo(
    () => form ?? (user ? toSettingsState(user) : createEmptySettingsState()),
    [form, user],
  );

  const detailQuery = useQuery<StorefrontOrderConfirmation>({
    queryKey: ["auth", "order", effectiveSelectedOrderId],
    queryFn: () => getOrderDetail(effectiveSelectedOrderId as number),
    enabled: Boolean(user && effectiveSelectedOrderId),
    initialData:
      dashboardQuery.data?.initialOrderDetail &&
      dashboardQuery.data.initialOrderDetail.orderId === effectiveSelectedOrderId
        ? dashboardQuery.data.initialOrderDetail
        : undefined,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
      router.refresh();
    },
    onError: (logoutError) => {
      setPageError(logoutError instanceof Error ? logoutError.message : "Unable to log out.");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (response) => {
      queryClient.setQueryData<AuthDashboardResponse>(["auth", "dashboard", ORDER_FETCH_LIMIT], (current) =>
        current
          ? { ...current, user: response.user }
          : { user: response.user, orders: [], total: 0, initialOrderDetail: null },
      );
      // Keep the global AuthProvider cache in sync so Header reflects changes immediately.
      queryClient.setQueryData<AuthUser | null>(["auth", "me"], response.user);
      setForm(toSettingsState(response.user));
      setSettingsError(null);
      setSettingsMessage(response.message ?? "Account settings updated.");
    },
    onError: (saveError) => {
      setSettingsError(saveError instanceof Error ? saveError.message : "Unable to save account settings.");
    },
  });

  function updateFormField(field: keyof Pick<SettingsFormState, "firstName" | "lastName" | "displayName">, value: string) {
    setForm((current) => ({ ...(current ?? resolvedForm), [field]: value }));
  }

  function updateBusinessField(field: keyof BusinessInfo, value: string) {
    setForm((current) => ({
      ...(current ?? resolvedForm),
      businessInfo: { ...(current ?? resolvedForm).businessInfo, [field]: value },
    }));
  }

  async function handleSaveSettings(): Promise<void> {
    if (!user || updateProfileMutation.isPending) {
      return;
    }

    setSettingsMessage(null);
    setSettingsError(null);

    const payload: UpdateProfilePayload = {
      firstName: resolvedForm.firstName,
      lastName: resolvedForm.lastName,
      displayName: resolvedForm.displayName,
      billingAddress: toPayloadAddress(resolvedForm.billingAddress),
      shippingAddress: toPayloadAddress(resolvedForm.shippingAddress),
      ...(user.accountType === "clinic" ? { businessInfo: resolvedForm.businessInfo } : {}),
    };

    await updateProfileMutation.mutateAsync(payload);
  }

  const bootLoading = dashboardQuery.isPending;
  const dashboardError =
    dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "Unable to load profile.";
  const clinicMessage = user ? formatClinicMessage(user) : null;
  const memberLabel = user ? formatAccountLabel(user) : null;
  const selectedOrderSummary = orders.find((order) => order.orderId === effectiveSelectedOrderId) ?? null;

  return (
    <div className="auth-page shop-page profile-page">
      <MotionProvider />
      <Header />

      <main className="container profile-main">
        <div className="profile-dashboard">
          {bootLoading ? <p className="profile-dashboard__loading">Loading account dashboard...</p> : null}

          {!bootLoading && state === "signup-success" ? (
            <ProfileBanner>Account created successfully. Your dashboard is ready whenever you want to continue.</ProfileBanner>
          ) : null}

          {!bootLoading && state === "clinic-pending" ? (
            <ProfileBanner>Business application received. Approval updates will appear in your account status.</ProfileBanner>
          ) : null}

          {!bootLoading && user && pageError ? (
            <div className="profile-dashboard__banner profile-dashboard__banner--error">{pageError}</div>
          ) : null}

          {!bootLoading && !user ? <SignedOutState error={pageError ?? dashboardError} /> : null}

          {user ? (
            <>
              <header className="profile-hero">
                <div className="profile-hero__identity">
                  <div className="profile-identity__mark" aria-hidden="true">
                    {(user.firstName?.[0] ?? "").toUpperCase()}
                    {(user.lastName?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="profile-hero__meta">
                    <span className="profile-dashboard__eyebrow">Account holder</span>
                    <h1 className="profile-hero__name">
                      {user.displayName || `${user.firstName} ${user.lastName}`.trim() || "Customer"}
                    </h1>
                    <div className="profile-hero__badges">
                      <span className="profile-hero__badge">{memberLabel}</span>
                      {user.accountType === "clinic" ? (
                        <span
                          className={`profile-hero__badge profile-hero__badge--status profile-hero__badge--${user.clinicStatus ?? "pending"}`}
                        >
                          {user.clinicStatus === "approved"
                            ? "Approved"
                            : user.clinicStatus === "rejected"
                              ? "Not approved"
                              : "Pending review"}
                        </span>
                      ) : null}
                    </div>
                    <p className="profile-hero__email">{user.email}</p>
                  </div>
                </div>

                <div className="profile-hero__actions">
                  <Link href="/products" className="profile-dashboard__button">
                    Continue shopping
                  </Link>
                  <button
                    type="button"
                    className="profile-dashboard__button profile-dashboard__button--secondary"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Signing out..." : "Log out"}
                  </button>
                </div>
              </header>

              {clinicMessage ? (
                <div className={`profile-clinic-notice profile-clinic-notice--${user.clinicStatus ?? "pending"}`}>
                  <span className="profile-dashboard__eyebrow">Business account</span>
                  <p>{clinicMessage}</p>
                  {user.businessInfo?.businessName || user.businessInfo?.clinicName ? (
                    <p className="profile-clinic-notice__sub">
                      Registered as {user.businessInfo.businessName || user.businessInfo.clinicName}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <nav className="profile-nav-strip" aria-label="Account navigation">
                <Link href="/cart" className="profile-nav-strip__link">
                  View Bag
                </Link>
                <Link href="/forgot-password" className="profile-nav-strip__link">
                  Reset Password
                </Link>
              </nav>

              <div className="profile-content">
                <OrdersSection
                  orders={orders}
                  loading={dashboardQuery.isPending}
                  error={null}
                  selectedOrderId={effectiveSelectedOrderId}
                  onRetry={() => void dashboardQuery.refetch()}
                  onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
                />

                {effectiveSelectedOrderId ? (
                  <OrderDetailPanel
                    order={detailQuery.data ?? null}
                    summary={selectedOrderSummary}
                    loading={detailQuery.isPending}
                    error={detailQuery.error instanceof Error ? detailQuery.error.message : null}
                    onRetry={() => void detailQuery.refetch()}
                  />
                ) : null}

                <AccountSettingsSection
                  user={user}
                  form={resolvedForm}
                  busy={updateProfileMutation.isPending}
                  message={settingsMessage}
                  error={settingsError}
                  onFieldChange={updateFormField}
                  onBusinessFieldChange={updateBusinessField}
                  onSubmit={() => void handleSaveSettings()}
                />
              </div>
            </>
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
