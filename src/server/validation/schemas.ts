import { z } from "zod";
import { PaymentStatus, StockAdjustmentReason, StockAdjustmentType } from "@/generated/prisma/client";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  password: z.string().min(1),
});

export const productCreateSchema = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(300),
  unit: z.string().trim().min(1).max(60),
  unitDetail: z.string().trim().max(300).optional(),
  openingStock: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  openingCost: z.coerce.number().min(0).max(1_000_000_000).default(0),
  purchaseCostNote: z.string().trim().max(500).optional(),
});

export const productUpdateSchema = z.object({
  code: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(300).optional(),
  unit: z.string().trim().min(1).max(60).optional().nullable(),
  unitDetail: z.string().trim().max(300).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export const restockSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1_000_000_000),
  costPerUnit: z.coerce.number().min(0).max(1_000_000_000),
  note: z.string().trim().max(500).optional(),
});

export const restockUpdateSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1_000_000_000).optional(),
  costPerUnit: z.coerce.number().min(0).max(1_000_000_000).optional(),
  note: z.string().trim().max(500).optional().nullable(),
  purchasedAt: z.coerce.date().optional(),
});

export const stockAdjustmentSchema = z.object({
  type: z.enum([StockAdjustmentType.INCREASE, StockAdjustmentType.DECREASE]),
  quantity: z.coerce.number().int().positive().max(1_000_000_000),
  reason: z.enum([
    StockAdjustmentReason.MISSING,
    StockAdjustmentReason.FOUND,
    StockAdjustmentReason.MISPLACED,
    StockAdjustmentReason.COUNTING_ERROR,
    StockAdjustmentReason.OTHER,
  ]),
  note: z.string().trim().max(500).optional(),
});

export const clientCreateSchema = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(300),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  address: z.string().trim().max(2000).optional(),
  prices: z
    .array(
      z.object({
        productId: z.string().min(1),
        price: z.coerce.number().min(0).max(1_000_000_000),
      })
    )
    .max(1000)
    .refine((prices) => new Set(prices.map((p) => p.productId)).size === prices.length, "Product prices must be unique")
    .optional()
    .default([]),
});

export const clientUpdateSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable().or(z.literal("")),
  address: z.string().trim().max(2000).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
});

export const clientProductPricesSchema = z.object({
  prices: z
    .array(
      z.object({
        productId: z.string().min(1),
        price: z.coerce.number().min(0).max(1_000_000_000),
      })
    )
    .max(1000),
});

export const clientProductPriceAdjustmentSchema = z.object({
  percentage: z.coerce.number().gt(-100).lte(1_000),
});

export const invoiceItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  price: z.coerce.number().min(0).max(1_000_000_000),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  items: z.array(invoiceItemInputSchema).min(1).max(200),
});

export const invoicePaymentStatusSchema = z.object({
  paymentStatus: z.enum([PaymentStatus.UNPAID, PaymentStatus.PAID]),
});

export const creditNoteCreateSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});
