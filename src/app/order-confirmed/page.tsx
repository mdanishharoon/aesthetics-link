import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MotionProvider from "@/components/MotionProvider";
import { getOrderConfirmation } from "@/lib/storefront/server";
import type { StorefrontOrderAddress, StorefrontOrderConfirmation } from "@/lib/storefront/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: StorefrontOrderAddress;
}) {
  const lines = address.lines.filter(Boolean);
  const contactLines = [address.email, address.phone].filter(Boolean);

  return (
    <section className="order-confirmed-card">
      <div className="order-confirmed-card__eyebrow">{title}</div>
      <div className="order-confirmed-address">
        {address.name ? <p className="order-confirmed-address__name">{address.name}</p> : null}
        {lines.map((line) => (
          <p key={`${title}:${line}`}>{line}</p>
        ))}
        {contactLines.length > 0 ? (
          <div className="order-confirmed-address__contact">
            {contactLines.map((line) => (
              <p key={`${title}:contact:${line}`}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OrderFallback({
  orderNumber,
  hasMissingQuery,
}: {
  orderNumber: string;
  hasMissingQuery: boolean;
}) {
  return (
    <section className="order-confirmed-fallback order-confirmed-card">
      <div className="order-confirmed-card__eyebrow">Confirmation Unavailable</div>
      <h2 className="order-confirmed-fallback__title">
        {hasMissingQuery ? "We could not verify this order confirmation." : "We could not load the full order details."}
      </h2>
      <p className="order-confirmed-fallback__text">
        {hasMissingQuery
          ? "This page is missing the order reference required to display your receipt. Please return using your confirmation email."
          : "The order appears to be complete, but the receipt details could not be loaded right now. Please use your confirmation email or contact support if you need immediate assistance."}
      </p>
      {orderNumber ? (
        <div className="order-confirmed-fallback__reference">
          <span>Reference</span>
          <strong>Order #{orderNumber}</strong>
        </div>
      ) : null}
    </section>
  );
}

function OrderReceipt({ order }: { order: StorefrontOrderConfirmation }) {
  const shippingAddress = order.shippingAddress.lines.length > 0 ? order.shippingAddress : order.billingAddress;

  return (
    <div className="order-confirmed-layout">
      <section className="order-confirmed-primary">
        <div className="order-confirmed-card order-confirmed-card--items">
          <div className="order-confirmed-card__header">
            <div>
              <div className="order-confirmed-card__eyebrow">Order Items</div>
              <h2 className="order-confirmed-card__title">
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"} confirmed
              </h2>
            </div>
            <div className="order-confirmed-card__meta">
              <span>{order.statusLabel}</span>
              <span>{order.createdAt}</span>
            </div>
          </div>

          <div className="order-confirmed-items">
            {order.items.map((item) => (
              <article key={`${item.id}:${item.variationId}:${item.name}`} className="order-confirmed-item">
                <div className="order-confirmed-item__media">
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <div className="order-confirmed-item__placeholder" aria-hidden="true">
                      {item.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="order-confirmed-item__content">
                  <div className="order-confirmed-item__header">
                    <div>
                      <h3>{item.name}</h3>
                      {item.sku ? <p className="order-confirmed-item__sku">SKU {item.sku}</p> : null}
                    </div>
                    <div className="order-confirmed-item__price">{item.lineTotal}</div>
                  </div>

                  <div className="order-confirmed-item__detail-row">
                    <span>Qty {item.quantity}</span>
                    <span>{item.unitPrice} each</span>
                  </div>

                  {item.meta.length > 0 ? (
                    <ul className="order-confirmed-item__meta-list" aria-label={`Order attributes for ${item.name}`}>
                      {item.meta.map((meta) => (
                        <li key={`${item.name}:${meta.label}:${meta.value}`}>
                          <span>{meta.label}</span>
                          <strong>{meta.value}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <aside className="order-confirmed-sidebar">
        <section className="order-confirmed-card order-confirmed-card--summary">
          <div className="order-confirmed-card__eyebrow">Order Summary</div>
          <div className="order-confirmed-summary__rows">
            <div>
              <span>Order number</span>
              <strong>#{order.orderNumber}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{order.paymentMethod || "Payment recorded"}</strong>
            </div>
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
            <div className="order-confirmed-summary__total">
              <span>Total</span>
              <strong>{order.totals.total}</strong>
            </div>
          </div>
        </section>

        <AddressBlock title="Delivery Address" address={shippingAddress} />
        <AddressBlock title="Billing Address" address={order.billingAddress} />

        <section className="order-confirmed-card">
          <div className="order-confirmed-card__eyebrow">Next Steps</div>
          <ul className="order-confirmed-next-steps">
            <li>A confirmation email has been issued to the billing contact.</li>
            <li>Keep order #{order.orderNumber} for any support or account queries.</li>
            <li>Delivery updates will follow once fulfillment begins.</li>
          </ul>
          {order.customerNote ? (
            <div className="order-confirmed-note">
              <span>Order note</span>
              <p>{order.customerNote}</p>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const orderId = getSingleParam(params, "order_id");
  const orderKey = getSingleParam(params, "key");
  const hasMissingQuery = !orderId || !orderKey;
  let order: StorefrontOrderConfirmation | null = null;

  if (!hasMissingQuery) {
    try {
      order = await getOrderConfirmation(orderId, orderKey);
    } catch (error) {
      console.error("[Order confirmation] Failed to load order details.", error);
    }
  }

  const orderNumber = order?.orderNumber ?? orderId;

  return (
    <div className="order-confirmed-page">
      <MotionProvider />
      <Header />

      <main className="order-confirmed-main">
        <section className="container order-confirmed-shell">
          <header className="order-confirmed-hero">
            <div className="order-confirmed-hero__status">Order Confirmed</div>
            <div className="order-confirmed-hero__grid">
              <div className="order-confirmed-hero__copy">
                <p className="order-confirmed-hero__eyebrow">Transaction Complete</p>
                <h1>Thank you. Your order has been received and recorded.</h1>
                <p className="order-confirmed-hero__text">
                  This page is your transaction receipt. Review the confirmed items, totals, and delivery information below.
                </p>
              </div>

              <div className="order-confirmed-hero__meta">
                <div>
                  <span>Order reference</span>
                  <strong>{orderNumber ? `#${orderNumber}` : "Unavailable"}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{order?.statusLabel ?? "Confirmed"}</strong>
                </div>
                <div>
                  <span>Placed</span>
                  <strong>{order?.createdAt ?? "Awaiting details"}</strong>
                </div>
              </div>
            </div>
          </header>

          {order ? (
            <OrderReceipt order={order} />
          ) : (
            <OrderFallback orderNumber={orderNumber} hasMissingQuery={hasMissingQuery} />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
