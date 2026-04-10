"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { getMe, getOrderDetail, getOrders, logout, updateProfile } from "@/lib/auth/client";
import type { AuthAddress, AuthOrderSummary, AuthUser, BusinessInfo, UpdateProfilePayload } from "@/lib/auth/types";
import type { StorefrontOrderAddress, StorefrontOrderConfirmation } from "@/lib/storefront/types";

const ORDER_FETCH_LIMIT = 12;

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
        <Link href="/order-lookup" className="profile-dashboard__button profile-dashboard__button--secondary">
          Find guest order
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

function AddressForm({
  title,
  address,
  includeEmail,
  onChange,
  onCopyFromBilling,
}: {
  title: string;
  address: AuthAddress;
  includeEmail?: boolean;
  onChange: (field: keyof AuthAddress, value: string) => void;
  onCopyFromBilling?: () => void;
}) {
  return (
    <section className="profile-settings__panel">
      <div className="profile-settings__panel-head">
        <div>
          <div className="profile-dashboard__eyebrow">{title}</div>
          <h3 className="profile-dashboard__section-title">{title}</h3>
        </div>
        {onCopyFromBilling ? (
          <button
            type="button"
            className="profile-dashboard__button profile-dashboard__button--secondary"
            onClick={onCopyFromBilling}
          >
            Copy billing
          </button>
        ) : null}
      </div>

      <div className="profile-settings__fields">
        <label className="profile-settings__field">
          <span>First name</span>
          <input value={address.firstName} onChange={(event) => onChange("firstName", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>Last name</span>
          <input value={address.lastName} onChange={(event) => onChange("lastName", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>Company</span>
          <input value={address.company} onChange={(event) => onChange("company", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>Phone</span>
          <input value={address.phone} onChange={(event) => onChange("phone", event.target.value)} />
        </label>
        {includeEmail ? (
          <label className="profile-settings__field profile-settings__field--wide">
            <span>Billing email</span>
            <input type="email" value={address.email} onChange={(event) => onChange("email", event.target.value)} />
          </label>
        ) : null}
        <label className="profile-settings__field profile-settings__field--wide">
          <span>Address line 1</span>
          <input value={address.address1} onChange={(event) => onChange("address1", event.target.value)} />
        </label>
        <label className="profile-settings__field profile-settings__field--wide">
          <span>Address line 2</span>
          <input value={address.address2} onChange={(event) => onChange("address2", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>City</span>
          <input value={address.city} onChange={(event) => onChange("city", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>State / county</span>
          <input value={address.state} onChange={(event) => onChange("state", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>Postcode</span>
          <input value={address.postcode} onChange={(event) => onChange("postcode", event.target.value)} />
        </label>
        <label className="profile-settings__field">
          <span>Country code</span>
          <input value={address.country} onChange={(event) => onChange("country", event.target.value.toUpperCase())} />
        </label>
      </div>
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
  onAddressChange,
  onCopyBillingToShipping,
  onSubmit,
}: {
  user: AuthUser;
  form: SettingsFormState;
  busy: boolean;
  message: string | null;
  error: string | null;
  onFieldChange: (field: keyof Pick<SettingsFormState, "firstName" | "lastName" | "displayName">, value: string) => void;
  onBusinessFieldChange: (field: keyof BusinessInfo, value: string) => void;
  onAddressChange: (type: "billingAddress" | "shippingAddress", field: keyof AuthAddress, value: string) => void;
  onCopyBillingToShipping: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="profile-settings">
      <div className="profile-settings__header">
        <div>
          <div className="profile-dashboard__eyebrow">Account settings</div>
          <h2 className="profile-dashboard__section-title">Billing, delivery, and account details</h2>
        </div>
        <button type="button" className="profile-dashboard__button" onClick={onSubmit} disabled={busy}>
          {busy ? "Saving..." : "Save settings"}
        </button>
      </div>

      {message ? <div className="profile-dashboard__banner">{message}</div> : null}
      {error ? <div className="profile-dashboard__banner profile-dashboard__banner--error">{error}</div> : null}

      <div className="profile-settings__grid">
        <section className="profile-settings__panel">
          <div className="profile-dashboard__eyebrow">Account details</div>
          <h3 className="profile-dashboard__section-title">Customer profile</h3>

          <div className="profile-settings__fields">
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
              <div className="profile-settings__fields">
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

        <AddressForm
          title="Billing address"
          address={form.billingAddress}
          includeEmail
          onChange={(field, value) => onAddressChange("billingAddress", field, value)}
        />

        <AddressForm
          title="Delivery address"
          address={form.shippingAddress}
          onChange={(field, value) => onAddressChange("shippingAddress", field, value)}
          onCopyFromBilling={onCopyBillingToShipping}
        />
      </div>
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
  const [bootLoading, setBootLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<AuthOrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<StorefrontOrderConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsFormState>({
    firstName: "",
    lastName: "",
    displayName: "",
    businessInfo: {},
    billingAddress: emptyAddress(),
    shippingAddress: emptyAddress(),
  });
  const state = searchParams.get("state");

  const loadOrders = useCallback(async (): Promise<AuthOrderSummary[]> => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const ordersResponse = await getOrders(ORDER_FETCH_LIMIT);
      const nextOrders = ordersResponse.orders ?? [];
      setOrders(nextOrders);
      return nextOrders;
    } catch (ordersLoadError) {
      setOrders([]);
      setOrdersError(
        ordersLoadError instanceof Error ? ordersLoadError.message : "Unable to load your order history.",
      );
      return [];
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadOrderDetail = useCallback(async (orderId: number) => {
    setSelectedOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await getOrderDetail(orderId);
      setSelectedOrderDetail(detail);
    } catch (orderError) {
      setSelectedOrderDetail(null);
      setDetailError(orderError instanceof Error ? orderError.message : "Unable to load order detail.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setBootLoading(true);
    setError(null);
    setSettingsMessage(null);

    try {
      const me = await getMe();
      setUser(me.user);
      setForm(toSettingsState(me.user));

      const nextOrders = await loadOrders();
      if (nextOrders.length > 0) {
        await loadOrderDetail(nextOrders[0].orderId);
      } else {
        setSelectedOrderId(null);
        setSelectedOrderDetail(null);
        setDetailError(null);
      }
    } catch (authError) {
      setUser(null);
      setOrders([]);
      setSelectedOrderId(null);
      setSelectedOrderDetail(null);
      setError(authError instanceof Error ? authError.message : "Unable to load profile.");
    } finally {
      setBootLoading(false);
    }
  }, [loadOrderDetail, loadOrders]);

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

  function updateFormField(field: keyof Pick<SettingsFormState, "firstName" | "lastName" | "displayName">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateBusinessField(field: keyof BusinessInfo, value: string) {
    setForm((current) => ({
      ...current,
      businessInfo: { ...current.businessInfo, [field]: value },
    }));
  }

  function updateAddressField(type: "billingAddress" | "shippingAddress", field: keyof AuthAddress, value: string) {
    setForm((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [field]: value,
      },
    }));
  }

  function copyBillingToShipping() {
    setForm((current) => ({
      ...current,
      shippingAddress: {
        ...current.shippingAddress,
        firstName: current.billingAddress.firstName,
        lastName: current.billingAddress.lastName,
        company: current.billingAddress.company,
        phone: current.billingAddress.phone,
        address1: current.billingAddress.address1,
        address2: current.billingAddress.address2,
        city: current.billingAddress.city,
        state: current.billingAddress.state,
        postcode: current.billingAddress.postcode,
        country: current.billingAddress.country,
      },
    }));
  }

  async function handleSaveSettings(): Promise<void> {
    if (!user || settingsBusy) {
      return;
    }

    setSettingsBusy(true);
    setSettingsMessage(null);
    setSettingsError(null);

    const payload: UpdateProfilePayload = {
      firstName: form.firstName,
      lastName: form.lastName,
      displayName: form.displayName,
      billingAddress: toPayloadAddress(form.billingAddress),
      shippingAddress: toPayloadAddress(form.shippingAddress),
      ...(user.accountType === "clinic" ? { businessInfo: form.businessInfo } : {}),
    };

    try {
      const response = await updateProfile(payload);
      setUser(response.user);
      setForm(toSettingsState(response.user));
      setSettingsMessage(response.message ?? "Account settings updated.");
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : "Unable to save account settings.");
    } finally {
      setSettingsBusy(false);
    }
  }

  const dashboardTitle = user ? `${user.firstName || "Customer"} account dashboard` : "Account dashboard";
  const clinicMessage = user ? formatClinicMessage(user) : null;
  const memberLabel = user ? formatAccountLabel(user) : null;
  const totalOrdersLabel = useMemo(() => `${orders.length} recent order${orders.length === 1 ? "" : "s"}`, [orders]);
  const selectedOrderSummary = orders.find((order) => order.orderId === selectedOrderId) ?? null;

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
                Review account details, track recent orders, inspect delivery information, and reopen formal receipts
                without searching your inbox.
              </p>
            </div>

            <div className="profile-dashboard__hero-note">
              <span>{user ? memberLabel : "Guest access"}</span>
              <strong>{user ? totalOrdersLabel : "Sign in required"}</strong>
            </div>
          </header>

          {bootLoading ? <p className="profile-dashboard__loading">Loading account dashboard...</p> : null}

          {!bootLoading && state === "signup-success" ? (
            <ProfileBanner>Account created successfully. Your dashboard is ready whenever you want to continue.</ProfileBanner>
          ) : null}

          {!bootLoading && state === "clinic-pending" ? (
            <ProfileBanner>Business application received. Approval updates will appear in your account status.</ProfileBanner>
          ) : null}

          {!bootLoading && !user ? <SignedOutState error={error} /> : null}

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
                        <dd>
                          {user.clinicStatus === "approved"
                            ? "Approved"
                            : user.clinicStatus === "rejected"
                              ? "Not approved"
                              : "Pending review"}
                        </dd>
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
                    <Link href="/order-lookup" className="profile-dashboard__button profile-dashboard__button--secondary">
                      Guest order lookup
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
                <OrdersSection
                  orders={orders}
                  loading={ordersLoading}
                  error={ordersError}
                  selectedOrderId={selectedOrderId}
                  onRetry={() => void loadOrders()}
                  onSelectOrder={(orderId) => void loadOrderDetail(orderId)}
                />

                {selectedOrderId ? (
                  <OrderDetailPanel
                    order={selectedOrderDetail}
                    summary={selectedOrderSummary}
                    loading={detailLoading}
                    error={detailError}
                    onRetry={() => void loadOrderDetail(selectedOrderId)}
                  />
                ) : null}

                <AccountSettingsSection
                  user={user}
                  form={form}
                  busy={settingsBusy}
                  message={settingsMessage}
                  error={settingsError}
                  onFieldChange={updateFormField}
                  onBusinessFieldChange={updateBusinessField}
                  onAddressChange={updateAddressField}
                  onCopyBillingToShipping={copyBillingToShipping}
                  onSubmit={() => void handleSaveSettings()}
                />
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
