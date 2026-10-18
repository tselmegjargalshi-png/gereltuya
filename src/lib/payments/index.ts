import "server-only";
import type { Plan } from "@prisma/client";

export type CreateInvoiceInput = { businessId: string; plan: Plan; amount: number; description: string };
export type InvoiceResult = { status: "PAID" | "PENDING" | "FAILED"; providerRef: string; checkoutUrl?: string };

export interface PaymentProvider {
  name: string;
  /** True when the provider charges real money. */
  live: boolean;
  createInvoice(input: CreateInvoiceInput): Promise<InvoiceResult>;
}

/**
 * Demo provider: marks invoices as paid immediately without charging anything.
 * A real provider (for example QPay or a card gateway) implements the same interface
 * and returns a checkoutUrl plus PENDING status, then confirms via webhook.
 */
const demoProvider: PaymentProvider = {
  name: "demo",
  live: false,
  async createInvoice(input) {
    return { status: "PAID", providerRef: `demo_${input.businessId.slice(-6)}_${Date.now()}` };
  },
};

export function getPaymentProvider(): PaymentProvider {
  return demoProvider;
}
