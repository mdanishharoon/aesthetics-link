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
import styles from "./ProfilePage.module.css";

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

function toneClassName(tone: string): string {
  if (tone === "complete" || tone === "approved") return styles.isComplete;
  if (tone === "active") return styles.isActive;
  if (tone === "inactive" || tone === "rejected") return styles.isInactive;
  return styles.isPending;
}

function clinicClassName(status: string | null | undefined): string {
  if (status === "approved") return styles.isApproved;
  if (status === "rejected") return styles.isRejected;
  return styles.isPending;
}

function ProfileBanner({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? styles.bannerError : styles.banner}>{children}</div>;
}

function SignedOutState({ error }: { error: string | null }) {
  return (
    <section className={styles.guestCard}>
      <div className={styles.eyebrow}>Account access</div>
      <h2 className={styles.sectionTitle}>Sign in to review your account and orders.</h2>
      <p className={styles.copy}>{error ?? "This area is available to signed-in customers only."}</p>
      <div className={styles.actionRow}>
        <Link href="/login" className={styles.button}>
          Log in
        </Link>
        <Link href="/signup" className={styles.buttonSecondary}>
          Create account
        </Link>
        <Link href="/order-lookup" className={styles.buttonSecondary}>
          Find guest order
        </Link>
      </div>
    </section>
  );
}

function OrdersEmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.eyebrow}>Orders</div>
      <h3 className={styles.sectionTitle}>No orders recorded yet.</h3>
      <p className={styles.copy}>
        Once you place an order, it will appear here with status, totals, and access to the formal receipt.
      </p>
      <div className={styles.actionRow}>
        <Link href="/products" className={styles.button}>
          Start shopping
        </Link>
      </div>
    </div>
  );
}

function OrdersErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.eyebrow}>Orders</div>
      <h3 className={styles.sectionTitle}>Orders could not be loaded.</h3>
      <p className={styles.copy}>{message}</p>
      <button type="button" className={styles.button} onClick={onRetry}>
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
    <section className={styles.detailAddress}>
      <div className={styles.eyebrow}>{label}</div>
      {address.name ? <p className={styles.addressName}>{address.name}</p> : null}
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
    <section className={styles.orderDetail}>
      <div className={styles.detailHeader}>
        <div>
          <div className={styles.eyebrow}>Selected order</div>
          <h3 className={styles.sectionTitle}>Order detail</h3>
        </div>
        {summary?.hasReceipt ? (
          <Link
            href={`/api/orders/receipt?receipt=${encodeURIComponent(summary.receiptToken)}`}
            className={styles.buttonSecondary}
          >
            Open receipt
          </Link>
        ) : null}
      </div>

      {loading ? <p className={styles.ordersLoading}>Loading order detail...</p> : null}

      {!loading && error ? (
        <div className={styles.empty}>
          <p className={styles.copy}>{error}</p>
          <button type="button" className={styles.button} onClick={onRetry}>
            Retry detail
          </button>
        </div>
      ) : null}

      {!loading && !error && order ? (
        <div className={styles.detailContent}>
          <div className={styles.detailMeta}>
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

          <div className={styles.detailItems}>
            {order.items.map((item) => (
              <article key={`${item.id}:${item.variationId}:${item.name}`} className={styles.detailItem}>
                <div>
                  <p className={styles.detailItemName}>{item.name}</p>
                  <p className={styles.detailItemMeta}>
                    Qty {item.quantity}
                    {item.sku ? ` • SKU ${item.sku}` : ""}
                    {item.meta.length > 0 ? ` • ${item.meta.map((meta) => `${meta.label}: ${meta.value}`).join(" • ")}` : ""}
                  </p>
                </div>
                <strong>{item.lineTotal}</strong>
              </article>
            ))}
          </div>

          <div className={styles.detailFooter}>
            <div className={styles.detailAddresses}>
              <OrderAddressBlock
                label="Delivery address"
                address={order.shippingAddress.lines.length > 0 ? order.shippingAddress : order.billingAddress}
              />
              <OrderAddressBlock label="Billing address" address={order.billingAddress} />
            </div>

            <div className={styles.detailTotals}>
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
              <div className={styles.grandTotal}>
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
    <section className={styles.settings}>
      <div className={styles.settingsHeader}>
        <div>
          <div className={styles.eyebrow}>Account settings</div>
          <h2 className={styles.sectionTitle}>Name and contact details</h2>
        </div>
        <button type="button" className={styles.button} onClick={onSubmit} disabled={busy}>
          {busy ? "Saving..." : "Save changes"}
        </button>
      </div>

      {(message || error) ? (
        <div className={styles.settingsState}>
          {message ? <ProfileBanner>{message}</ProfileBanner> : null}
          {error ? <ProfileBanner error>{error}</ProfileBanner> : null}
        </div>
      ) : null}

      <div className={styles.fieldGridWide}>
        <label className={styles.field}>
          <span>First name</span>
          <input value={form.firstName} onChange={(event) => onFieldChange("firstName", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Last name</span>
          <input value={form.lastName} onChange={(event) => onFieldChange("lastName", event.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Display name</span>
          <input value={form.displayName} onChange={(event) => onFieldChange("displayName", event.target.value)} />
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Account email</span>
          <input value={user.email} disabled readOnly />
        </label>
      </div>

      {user.accountType === "clinic" ? (
        <div className={styles.businessSection}>
          <div>
            <div className={styles.eyebrow}>Business information</div>
            <p className={styles.copy}>Refine the details attached to your approved professional account.</p>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>Clinic name</span>
              <input
                value={form.businessInfo.clinicName ?? ""}
                onChange={(event) => onBusinessFieldChange("clinicName", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Business name</span>
              <input
                value={form.businessInfo.businessName ?? ""}
                onChange={(event) => onBusinessFieldChange("businessName", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Business phone</span>
              <input
                value={form.businessInfo.phone ?? ""}
                onChange={(event) => onBusinessFieldChange("phone", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Website</span>
              <input
                value={form.businessInfo.website ?? ""}
                onChange={(event) => onBusinessFieldChange("website", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>License number</span>
              <input
                value={form.businessInfo.licenseNumber ?? ""}
                onChange={(event) => onBusinessFieldChange("licenseNumber", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Tax ID</span>
              <input value={form.businessInfo.taxId ?? ""} onChange={(event) => onBusinessFieldChange("taxId", event.target.value)} />
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
    <section className={styles.orders} aria-labelledby="profile-orders-title">
      <div className={styles.ordersHeader}>
        <div>
          <div className={styles.eyebrow}>Orders</div>
          <h2 id="profile-orders-title" className={styles.sectionTitle}>
            Order history and receipts
          </h2>
        </div>
        <div className={styles.ordersSummary}>
          <span>{orders.length} shown</span>
          <strong>{latestOrder ? `Latest: ${latestOrder.createdAt}` : "No orders yet"}</strong>
        </div>
      </div>

      {loading ? (
        <div className={styles.ordersLoading}>Loading your recent orders...</div>
      ) : error ? (
        <OrdersErrorState message={error} onRetry={onRetry} />
      ) : orders.length === 0 ? (
        <OrdersEmptyState />
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => {
            const tone = getOrderStatusTone(order.status);
            const selected = selectedOrderId === order.orderId;
            return (
              <article
                key={order.orderId}
                className={`${styles.orderCard} ${selected ? styles.orderCardSelected : ""}`.trim()}
              >
                <div className={styles.orderPrimary}>
                  <div className={styles.orderNumber}>Order #{order.orderNumber}</div>
                  <p className={styles.orderPreview}>{buildOrderPreview(order)}</p>
                  {order.paymentMethod ? <p className={styles.orderMeta}>{order.paymentMethod}</p> : null}
                </div>

                <div className={styles.orderSecondary}>
                  <span className={styles.orderMobileLabel}>Placed</span>
                  <strong>{order.createdAt}</strong>
                </div>

                <div className={styles.orderSecondary}>
                  <span className={styles.orderMobileLabel}>Status</span>
                  <span className={`${styles.orderStatus} ${toneClassName(tone)}`.trim()}>{order.statusLabel}</span>
                </div>

                <div className={styles.orderSecondary}>
                  <span className={styles.orderMobileLabel}>Total</span>
                  <strong>{order.total}</strong>
                </div>

                <div className={styles.orderActions}>
                  <button type="button" className={styles.buttonSecondary} onClick={() => onSelectOrder(order.orderId)}>
                    {selected ? "Viewing" : "View detail"}
                  </button>
                  {order.hasReceipt ? (
                    <Link
                      href={`/api/orders/receipt?receipt=${encodeURIComponent(order.receiptToken)}`}
                      className={styles.buttonSecondary}
                    >
                      Receipt
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
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
    <div className={styles.page}>
      <MotionProvider />
      <Header darkLogo forceScrolled />

      <main className={`container ${styles.main}`}>
        <div className={styles.dashboard}>
          {bootLoading ? <p className={styles.loading}>Loading account dashboard...</p> : null}

          {!bootLoading && state === "signup-success" ? (
            <ProfileBanner>Account created successfully. Your dashboard is ready whenever you want to continue.</ProfileBanner>
          ) : null}

          {!bootLoading && state === "clinic-pending" ? (
            <ProfileBanner>Business application received. Approval updates will appear in your account status.</ProfileBanner>
          ) : null}

          {!bootLoading && user && pageError ? <ProfileBanner error>{pageError}</ProfileBanner> : null}

          {!bootLoading && !user ? <SignedOutState error={pageError ?? dashboardError} /> : null}

          {user ? (
            <>
              <header className={styles.hero}>
                <div className={styles.identity}>
                  <div className={styles.mark} aria-hidden="true">
                    {(user.firstName?.[0] ?? "").toUpperCase()}
                    {(user.lastName?.[0] ?? "").toUpperCase()}
                  </div>

                  <div className={styles.heroMeta}>
                    <span className={styles.eyebrow}>Account holder</span>
                    <h1 className={styles.heroName}>
                      {user.displayName || `${user.firstName} ${user.lastName}`.trim() || "Customer"}
                    </h1>
                    <div className={styles.heroBadges}>
                      <span className={styles.accountPill}>{memberLabel}</span>
                      {user.accountType === "clinic" ? (
                        <span className={`${styles.badgeStatus} ${clinicClassName(user.clinicStatus)}`.trim()}>
                          {user.clinicStatus === "approved"
                            ? "Approved"
                            : user.clinicStatus === "rejected"
                              ? "Not approved"
                              : "Pending review"}
                        </span>
                      ) : null}
                    </div>
                    <p className={styles.heroEmail}>{user.email}</p>
                  </div>
                </div>

                <div className={styles.heroAside}>
                  <p className={styles.heroBlurb}>
                    Review recent orders, open formal receipts, and keep your account details aligned with your next purchase.
                  </p>
                  <div className={styles.heroActions}>
                    <Link href="/products" className={styles.button}>
                      Continue shopping
                    </Link>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      {logoutMutation.isPending ? "Signing out..." : "Log out"}
                    </button>
                  </div>
                  <nav className={styles.statusStrip} aria-label="Account navigation">
                    <Link href="/cart" className={styles.statusStripLink}>
                      View bag
                    </Link>
                    <Link href="/forgot-password" className={styles.statusStripLink}>
                      Reset password
                    </Link>
                  </nav>
                </div>
              </header>

              {clinicMessage ? (
                <div className={`${styles.clinicNotice} ${clinicClassName(user.clinicStatus)}`.trim()}>
                  <span className={styles.eyebrow}>Business account</span>
                  <p>{clinicMessage}</p>
                  {user.businessInfo?.businessName || user.businessInfo?.clinicName ? (
                    <p className={styles.clinicNoticeSub}>
                      Registered as {user.businessInfo.businessName || user.businessInfo.clinicName}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.content}>
                <div className={styles.orderWorkspace}>
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
                </div>

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
        <div className={styles.page}>
          <main className={`container ${styles.main}`}>
            <p className={`${styles.loading} ${styles.loadingShell}`}>Loading account dashboard...</p>
          </main>
        </div>
      }
    >
      <ProfileDashboard />
    </Suspense>
  );
}
