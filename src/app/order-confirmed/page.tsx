import Link from "next/link";
import { cookies } from "next/headers";

import CheckoutCompletionCartReset from "@/components/CheckoutCompletionCartReset";
import Header from "@/components/Header";
import OrderCompletionMarketing from "@/components/OrderCompletionMarketing";
import { getOrderConfirmation } from "@/lib/storefront/server";
import type { StorefrontOrderAddress, StorefrontOrderConfirmation } from "@/lib/storefront/types";
import styles from "./OrderConfirmedPage.module.css";

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
    <section className={styles.addressCard}>
      <div className={styles.addressLabel}>{label}</div>
      {address.name ? <p className={styles.addressName}>{address.name}</p> : null}
      {lines.map((line) => (
        <p key={`${label}:${line}`}>{line}</p>
      ))}
      {contacts.map((contact) => (
        <p key={`${label}:contact:${contact}`}>{contact}</p>
      ))}
    </section>
  );
}

function OrderFallback({
  hasMissingReceipt,
}: {
  hasMissingReceipt: boolean;
}) {
  return (
    <article className={styles.fallback}>
      <section className={styles.fallbackCard}>
        <p className={styles.brand}>AestheticsLink</p>
        <div className={styles.kicker}>Order confirmation</div>
        <h1 className={styles.title}>
          {hasMissingReceipt ? "We could not verify this order receipt." : "We could not load the full order details."}
        </h1>
        <p className={styles.summary}>
          {hasMissingReceipt
            ? "This receipt link is missing or has expired. Reopen the completion link from checkout or use your confirmation email if you need the order details again."
            : "The order appears complete, but the receipt data could not be loaded right now. Please use your confirmation email if you need to review the order immediately."}
        </p>
        <div className={styles.actions}>
          <Link href={STOREFRONT_RETURN_HREF} className={styles.action}>
            Return to storefront
          </Link>
        </div>
      </section>
    </article>
  );
}

function OrderReceipt({ order }: { order: StorefrontOrderConfirmation }) {
  const shippingAddress = order.shippingAddress.lines.length > 0 ? order.shippingAddress : order.billingAddress;

  return (
    <article className={styles.receipt} aria-labelledby="order-receipt-title">
      <section className={styles.hero}>
        <div className={styles.brandBlock}>
          <p className={styles.brand}>AestheticsLink</p>
          <div className={styles.kicker}>Formal order receipt</div>
          <h1 id="order-receipt-title" className={styles.title}>
            Order received,
            <br />
            beautifully recorded.
          </h1>
          <p className={styles.summary}>
            This document confirms your submitted order, payment reference, delivery details, and final line-item totals.
          </p>
          <div className={styles.actions}>
            <Link href={STOREFRONT_RETURN_HREF} className={styles.action}>
              Continue shopping
            </Link>
            <Link href="/profile" className={styles.secondaryAction}>
              Open account
            </Link>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.statusMeta}>
            <span className={styles.statusLabel}>Status</span>
            <strong className={styles.statusValue}>{order.statusLabel}</strong>
          </div>
          <dl className={styles.metaGrid}>
            <div>
              <dt>Order number</dt>
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
      </section>

      <div className={styles.receiptWorkspace}>
        <div className={styles.receiptMain}>
          <section className={styles.itemsSection}>
            <div className={styles.itemsHeader}>
              <div className={styles.itemsHead}>Line items</div>
              <p className={styles.itemsCount}>
                {order.itemCount} confirmed {order.itemCount === 1 ? "item" : "items"}
              </p>
            </div>

            <div className={styles.itemsList}>
              {order.items.map((item) => (
                <article key={`${item.id}:${item.variationId}:${item.name}`} className={styles.itemRow}>
                  <div>
                    <p className={styles.itemName}>{item.name}</p>
                    <div className={styles.itemMeta}>
                      <span>Qty {item.quantity}</span>
                      {item.sku ? <span>SKU {item.sku}</span> : null}
                      {item.meta.map((meta) => (
                        <span key={`${item.name}:${meta.label}:${meta.value}`}>
                          {meta.label}: {meta.value}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.itemQtyPrice}>
                    <span className={styles.itemQty}>{item.unitPrice}</span>
                    <strong className={styles.itemTotal}>{item.lineTotal}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <OrderCompletionMarketing
            orderId={order.orderId}
            orderNumber={order.orderNumber}
            itemCount={order.itemCount}
            total={order.totals.total}
            billingEmail={order.billingAddress.email ?? ""}
          />
        </div>

        <aside className={styles.receiptAside} aria-label="Receipt summary">
          <section className={styles.addresses}>
            <AddressBlock label="Delivery address" address={shippingAddress} />
            <AddressBlock label="Billing address" address={order.billingAddress} />
          </section>

          <section className={styles.footerGrid}>
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Subtotal</span>
                <strong className={styles.totalValue}>{order.totals.subtotal}</strong>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Shipping</span>
                <strong className={styles.totalValue}>{order.totals.shipping}</strong>
              </div>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Tax</span>
                <strong className={styles.totalValue}>{order.totals.tax}</strong>
              </div>
              <div className={styles.grandTotal}>
                <span className={styles.totalLabel}>Total</span>
                <strong className={styles.totalValue}>{order.totals.total}</strong>
              </div>
            </div>

            <div className={styles.notes}>
              <div className={styles.notesListLabel}>Operational notes</div>
              <ul className={styles.notesList}>
                <li>A confirmation email has been issued to the billing contact.</li>
                <li>Keep order #{order.orderNumber} for account or support queries.</li>
                <li>Delivery updates will follow once fulfillment begins.</li>
              </ul>

              {order.customerNote ? (
                <div className={styles.customerNote}>
                  <span>Order note</span>
                  <p>{order.customerNote}</p>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const justCompleted = getSingleParam(params, "just_completed") === "1";
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
    <div className={styles.page}>
      <Header darkLogo forceScrolled />
      <main className={`container ${styles.main}`}>
        <CheckoutCompletionCartReset shouldReset={justCompleted} />
        <div className={styles.frame}>
          {order ? <OrderReceipt order={order} /> : <OrderFallback hasMissingReceipt={hasMissingReceipt} />}
        </div>
      </main>
    </div>
  );
}
