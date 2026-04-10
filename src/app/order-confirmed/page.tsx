"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderConfirmedContent() {
  const params = useSearchParams();
  const orderId = params.get("order_id");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-semibold tracking-tight">Order placed</h1>
        {orderId && (
          <p className="text-sm text-muted-foreground">Order #{orderId}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Thank you for your order. You will receive a confirmation email shortly.
        </p>
        <Link
          href="/products"
          className="inline-block mt-4 px-6 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmedPage() {
  return (
    <>
      <MotionProvider />
      <Header />
      <main className="flex-1">
        <Suspense>
          <OrderConfirmedContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
