"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { lookupGuestOrder } from "@/lib/storefront/client";
import type { StorefrontOrderAddress, StorefrontOrderLookupResult } from "@/lib/storefront/types";

function AddressBlock({
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

export default function OrderLookupPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StorefrontOrderLookupResult | null>(null);

  const lookupMutation = useMutation({
    mutationFn: ({ nextOrderNumber, nextEmail }: { nextOrderNumber: string; nextEmail: string }) =>
      lookupGuestOrder(nextOrderNumber, nextEmail),
    onSuccess: (payload) => {
      setError(null);
      setResult(payload);
    },
    onError: (lookupError) => {
      setResult(null);
      setError(lookupError instanceof Error ? lookupError.message : "Unable to locate that order.");
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (lookupMutation.isPending) {
      return;
    }

    setError(null);
    setResult(null);
    await lookupMutation.mutateAsync({ nextOrderNumber: orderNumber, nextEmail: email });
  }

  const order = result?.order ?? null;

  return (
    <div className="auth-page shop-page profile-page">
      <MotionProvider />
      <Header />

      <main className="container profile-main">
        <div className="profile-dashboard order-lookup">
          <header className="profile-dashboard__hero">
            <div className="profile-dashboard__hero-copy">
              <p className="profile-dashboard__eyebrow">Guest order lookup</p>
              <h1 className="profile-dashboard__title">Find a guest order and reopen the receipt.</h1>
              <p className="profile-dashboard__subtitle">
                Enter the order number and billing email used at checkout. If they match, you can review the order and
                reopen the formal receipt.
              </p>
            </div>

            <div className="profile-dashboard__hero-note">
              <span>Lookup keys</span>
              <strong>Order number + billing email</strong>
            </div>
          </header>

          <section className="profile-settings order-lookup__form-shell">
            <div className="profile-settings__header">
              <div>
                <div className="profile-dashboard__eyebrow">Lookup form</div>
                <h2 className="profile-dashboard__section-title">Recover an order</h2>
              </div>
              <Link href="/login" className="profile-dashboard__button profile-dashboard__button--secondary">
                Log in instead
              </Link>
            </div>

            <form className="profile-settings__fields" onSubmit={handleSubmit}>
              <label className="profile-settings__field">
                <span>Order number</span>
                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="e.g. 1234"
                  required
                />
              </label>
              <label className="profile-settings__field">
                <span>Billing email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email used at checkout"
                  required
                />
              </label>
              <div className="profile-dashboard__action-row order-lookup__actions">
                <button type="submit" className="profile-dashboard__button" disabled={lookupMutation.isPending}>
                  {lookupMutation.isPending ? "Searching..." : "Find order"}
                </button>
              </div>
            </form>

            {error ? <div className="profile-dashboard__banner profile-dashboard__banner--error">{error}</div> : null}
          </section>

          {order ? (
            <section className="profile-order-detail">
              <div className="profile-order-detail__header">
                <div>
                  <div className="profile-dashboard__eyebrow">Order located</div>
                  <h2 className="profile-dashboard__section-title">Order #{order.orderNumber}</h2>
                </div>
                {order.hasReceipt ? (
                  <Link
                    href={`/api/orders/receipt?receipt=${encodeURIComponent(order.receiptToken)}`}
                    className="profile-dashboard__button profile-dashboard__button--secondary"
                  >
                    Open receipt
                  </Link>
                ) : null}
              </div>

              <div className="profile-order-detail__content">
                <div className="profile-order-detail__meta">
                  <div>
                    <span>Status</span>
                    <strong>{order.statusLabel}</strong>
                  </div>
                  <div>
                    <span>Placed</span>
                    <strong>{order.createdAt}</strong>
                  </div>
                  <div>
                    <span>Payment</span>
                    <strong>{order.paymentMethod || "Payment recorded"}</strong>
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
                        <p>Qty {item.quantity}</p>
                      </div>
                      <strong>{item.lineTotal}</strong>
                    </article>
                  ))}
                </div>

                <div className="profile-order-detail__footer">
                  <div className="profile-order-detail__addresses">
                    <AddressBlock
                      label="Delivery address"
                      address={order.shippingAddress.lines.length > 0 ? order.shippingAddress : order.billingAddress}
                    />
                    <AddressBlock label="Billing address" address={order.billingAddress} />
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
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
