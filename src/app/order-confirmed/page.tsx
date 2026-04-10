import Link from "next/link";
import { cookies } from "next/headers";

import { getOrderConfirmation } from "@/lib/storefront/server";
import type { StorefrontOrderAddress, StorefrontOrderConfirmation } from "@/lib/storefront/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const RECEIPT_TOKEN_COOKIE = "al_order_receipt";
const STOREFRONT_RETURN_HREF = "/products";

function getSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function AddressBlock({
  label,
  address,
}: {
  label: string;
  address: StorefrontOrderAddress;
}) {
  const lines = address.lines.filter(Boolean);
  const contacts = [address.email, address.phone].filter(Boolean);

  return (
    <section className="order-receipt__address-block">
      <div className="order-receipt__kicker">{label}</div>
      {address.name ? <p className="order-receipt__address-name">{address.name}</p> : null}
      {lines.map((line) => (
        <p key={`${label}:${line}`}>{line}</p>
      ))}
      {contacts.length > 0 ? (
        <div className="order-receipt__address-contact">
          {contacts.map((contact) => (
            <p key={`${label}:contact:${contact}`}>{contact}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OrderFallback({
  hasMissingReceipt,
}: {
  hasMissingReceipt: boolean;
}) {
  return (
    <article className="order-receipt order-receipt--fallback">
      <header className="order-receipt__header">
        <div>
          <p className="order-receipt__brand">AestheticsLink</p>
          <div className="order-receipt__kicker">Order Confirmation</div>
        </div>
      </header>

      <section className="order-receipt__section">
        <h1 className="order-receipt__title">
          {hasMissingReceipt ? "We could not verify this order receipt." : "We could not load the full order details."}
        </h1>
        <p className="order-receipt__summary">
          {hasMissingReceipt
            ? "This receipt link is missing or has expired. Reopen the completion link from checkout or use your confirmation email if you need the order details again."
            : "The order appears complete, but the receipt data could not be loaded right now. Please use your confirmation email if you need to review the order immediately."}
        </p>
      </section>

      <section className="order-receipt__section order-receipt__actions">
        <Link href={STOREFRONT_RETURN_HREF} className="order-receipt__action-link">
          Return to storefront
        </Link>
      </section>
    </article>
  );
}

function OrderReceipt({ order }: { order: StorefrontOrderConfirmation }) {
  const shippingAddress = order.shippingAddress.lines.length > 0 ? order.shippingAddress : order.billingAddress;

  return (
    <article className="order-receipt" aria-labelledby="order-receipt-title">
      <header className="order-receipt__header">
        <div className="order-receipt__masthead">
          <div>
            <p className="order-receipt__brand">AestheticsLink</p>
            <div className="order-receipt__kicker">Formal Order Receipt</div>
          </div>
          <div className="order-receipt__status-block">
            <span className="order-receipt__status-label">Status</span>
            <strong>{order.statusLabel}</strong>
          </div>
        </div>

        <div className="order-receipt__hero">
          <div>
            <h1 id="order-receipt-title" className="order-receipt__title">
              Order received and recorded.
            </h1>
            <p className="order-receipt__summary">
              This document confirms the submitted order, payment reference, delivery address, and line-item totals.
            </p>
          </div>

          <dl className="order-receipt__meta-grid">
            <div>
              <dt>Order Number</dt>
              <dd>#{order.orderNumber}</dd>
            </div>
            <div>
              <dt>Placed</dt>
              <dd>{order.createdAt}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{order.paymentMethod || "Payment recorded"}</dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd>{order.itemCount}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="order-receipt__section order-receipt__address-grid">
        <AddressBlock label="Delivery Address" address={shippingAddress} />
        <AddressBlock label="Billing Address" address={order.billingAddress} />
      </section>

      <section className="order-receipt__section">
        <div className="order-receipt__section-head">
          <div className="order-receipt__kicker">Line Items</div>
          <p>{order.itemCount} confirmed {order.itemCount === 1 ? "item" : "items"}</p>
        </div>

        <div className="order-receipt__table" role="table" aria-label="Ordered items">
          <div className="order-receipt__table-head" role="row">
            <span role="columnheader">Item</span>
            <span role="columnheader">Qty</span>
            <span role="columnheader">Unit</span>
            <span role="columnheader">Total</span>
          </div>

          <div className="order-receipt__table-body">
            {order.items.map((item) => (
              <div
                key={`${item.id}:${item.variationId}:${item.name}`}
                className="order-receipt__table-row"
                role="row"
              >
                <div className="order-receipt__table-item" role="cell">
                  <strong>{item.name}</strong>
                  <div className="order-receipt__table-item-meta">
                    {item.sku ? <span>SKU {item.sku}</span> : null}
                    {item.meta.map((meta) => (
                      <span key={`${item.name}:${meta.label}:${meta.value}`}>
                        {meta.label}: {meta.value}
                      </span>
                    ))}
                  </div>
                </div>
                <span role="cell">{item.quantity}</span>
                <span role="cell">{item.unitPrice}</span>
                <strong role="cell">{item.lineTotal}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="order-receipt__section order-receipt__footer-grid">
        <div className="order-receipt__next-steps">
          <div className="order-receipt__kicker">Operational Notes</div>
          <ul>
            <li>A confirmation email has been issued to the billing contact.</li>
            <li>Keep order #{order.orderNumber} for account or support queries.</li>
            <li>Delivery updates will follow once fulfillment begins.</li>
          </ul>
          {order.customerNote ? (
            <div className="order-receipt__customer-note">
              <span>Order Note</span>
              <p>{order.customerNote}</p>
            </div>
          ) : null}

          <div className="order-receipt__actions">
            <Link href={STOREFRONT_RETURN_HREF} className="order-receipt__action-link">
              Return to storefront
            </Link>
          </div>
        </div>

        <div className="order-receipt__totals">
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
          <div className="order-receipt__grand-total">
            <span>Total</span>
            <strong>{order.totals.total}</strong>
          </div>
        </div>
      </section>
    </article>
  );
}

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const receiptFromQuery = getSingleParam(params, "receipt");
  const cookieStore = await cookies();
  const receiptFromCookie = cookieStore.get(RECEIPT_TOKEN_COOKIE)?.value?.trim() ?? "";
  const receiptToken = receiptFromCookie || receiptFromQuery;
  const hasMissingReceipt = !receiptToken;
  let order: StorefrontOrderConfirmation | null = null;

  if (!hasMissingReceipt) {
    try {
      order = await getOrderConfirmation(receiptToken);
    } catch (error) {
      console.error("[Order confirmation] Failed to load order details.", error);
    }
  }

  return (
    <main className="order-receipt-page">
      <div className="order-receipt-page__frame">
        {order ? (
          <OrderReceipt order={order} />
        ) : (
          <OrderFallback hasMissingReceipt={hasMissingReceipt} />
        )}
      </div>
    </main>
  );
}
