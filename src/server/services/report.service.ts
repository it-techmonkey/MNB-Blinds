import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type PaymentStatusFilter = "PAID" | "UNPAID";
export type Granularity = "day" | "month" | "year";

export type ReportFilters = {
  from?: Date;
  /** Exclusive upper bound. */
  toExclusive?: Date;
  clientId?: string;
  productId?: string;
  paymentStatus?: PaymentStatusFilter;
};

export type ParsedReportFilters = {
  filters: ReportFilters;
  fromInput: string;
  toInput: string;
  clientId: string;
  productId: string;
  paymentStatus: "" | PaymentStatusFilter;
};

function parseDateInput(value: string | undefined): Date | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const d = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseReportFilters(sp: Record<string, string | undefined>): ParsedReportFilters {
  const fromInput = sp.from?.trim() || "";
  const toInput = sp.to?.trim() || "";
  const clientId = sp.clientId?.trim() || "";
  const productId = sp.productId?.trim() || "";
  const statusRaw = sp.status?.trim().toUpperCase() || "";
  const paymentStatus = statusRaw === "PAID" || statusRaw === "UNPAID" ? statusRaw : "";

  const from = parseDateInput(fromInput);
  const toStart = parseDateInput(toInput);
  const toExclusive = toStart ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000) : undefined;

  return {
    filters: {
      from,
      toExclusive,
      clientId: clientId || undefined,
      productId: productId || undefined,
      paymentStatus: paymentStatus || undefined,
    },
    fromInput,
    toInput,
    clientId,
    productId,
    paymentStatus,
  };
}

export function buildReportQueryString(parsed: ParsedReportFilters): string {
  const params = new URLSearchParams();
  if (parsed.fromInput) params.set("from", parsed.fromInput);
  if (parsed.toInput) params.set("to", parsed.toInput);
  if (parsed.clientId) params.set("clientId", parsed.clientId);
  if (parsed.productId) params.set("productId", parsed.productId);
  if (parsed.paymentStatus) params.set("status", parsed.paymentStatus);
  return params.toString();
}

function conditions(f: ReportFilters): Prisma.Sql[] {
  const c: Prisma.Sql[] = [Prisma.sql`NOT EXISTS (SELECT 1 FROM "credit_notes" cn WHERE cn."invoice_id" = i."id")`];
  if (f.from) c.push(Prisma.sql`i."created_at" >= ${f.from}`);
  if (f.toExclusive) c.push(Prisma.sql`i."created_at" < ${f.toExclusive}`);
  if (f.clientId) c.push(Prisma.sql`i."client_id" = ${f.clientId}`);
  if (f.productId) c.push(Prisma.sql`ii."product_id" = ${f.productId}`);
  if (f.paymentStatus) c.push(Prisma.sql`i."payment_status" = ${f.paymentStatus}::"PaymentStatus"`);
  return c;
}

function whereSql(f: ReportFilters): Prisma.Sql {
  const cs = conditions(f);
  return cs.length ? Prisma.join(cs, " AND ") : Prisma.sql`TRUE`;
}

export function pickGranularity(from: Date | undefined, to: Date): Granularity {
  if (!from) return "month";
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days <= 62) return "day";
  if (days <= 1100) return "month";
  return "year";
}

/** % string with 1 decimal, guarded against divide-by-zero. */
function marginPct(profit: Prisma.Decimal, revenue: Prisma.Decimal): string {
  if (revenue.isZero()) return "0.0";
  return profit.div(revenue).mul(100).toFixed(1);
}

export type ReportSummary = {
  revenue: string;
  cost: string;
  profit: string;
  profitMargin: string;
  units: number;
  invoiceCount: number;
  avgOrderValue: string;
};

export async function getReportSummary(f: ReportFilters): Promise<ReportSummary> {
  const rows = await prisma.$queryRaw<
    { revenue: Prisma.Decimal | null; cost: Prisma.Decimal | null; units: bigint | null; invoiceCount: bigint }[]
  >`
    SELECT SUM(ii."total") AS revenue,
      SUM(ii."quantity" * p."current_cost") AS cost,
      SUM(ii."quantity")::bigint AS units,
      COUNT(DISTINCT i."id")::bigint AS "invoiceCount"
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    JOIN "products" p ON p."id" = ii."product_id"
    WHERE ${whereSql(f)}
  `;
  const row = rows[0];
  const revenue = row?.revenue ?? new Prisma.Decimal(0);
  const cost = row?.cost ?? new Prisma.Decimal(0);
  const profit = revenue.sub(cost);
  const invoiceCount = Number(row?.invoiceCount ?? 0);
  const units = Number(row?.units ?? 0);
  const avgOrderValue = invoiceCount > 0 ? revenue.div(invoiceCount) : new Prisma.Decimal(0);

  return {
    revenue: revenue.toFixed(2),
    cost: cost.toFixed(2),
    profit: profit.toFixed(2),
    profitMargin: marginPct(profit, revenue),
    units,
    invoiceCount,
    avgOrderValue: avgOrderValue.toFixed(2),
  };
}

export type TrendPoint = { bucket: string; revenue: string; units: number };

export async function getRevenueTrend(f: ReportFilters, granularity: Granularity): Promise<TrendPoint[]> {
  const rows = await prisma.$queryRaw<{ bucket: Date; revenue: Prisma.Decimal; units: bigint }[]>`
    SELECT DATE_TRUNC(${granularity}, i."created_at") AS bucket,
      SUM(ii."total") AS revenue,
      SUM(ii."quantity")::bigint AS units
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    WHERE ${whereSql(f)}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  return rows.map((r) => ({ bucket: r.bucket.toISOString(), revenue: r.revenue.toFixed(2), units: Number(r.units) }));
}

export type ProductBreakdownRow = {
  productId: string;
  productCode: string;
  productName: string;
  unitsSold: number;
  revenue: string;
  cost: string;
  profit: string;
  profitMargin: string;
  invoiceCount: number;
};

export async function getProductBreakdown(f: ReportFilters, limit = 25): Promise<ProductBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    {
      productId: string;
      productCode: string;
      productName: string;
      unitsSold: bigint;
      revenue: Prisma.Decimal;
      cost: Prisma.Decimal;
      invoiceCount: bigint;
    }[]
  >`
    SELECT ii."product_id" AS "productId",
      MAX(ii."product_code_snapshot") AS "productCode",
      MAX(ii."product_name_snapshot") AS "productName",
      SUM(ii."quantity")::bigint AS "unitsSold",
      SUM(ii."total") AS revenue,
      SUM(ii."quantity" * p."current_cost") AS cost,
      COUNT(DISTINCT i."id")::bigint AS "invoiceCount"
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    JOIN "products" p ON p."id" = ii."product_id"
    WHERE ${whereSql(f)}
    GROUP BY ii."product_id"
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => {
    const profit = r.revenue.sub(r.cost);
    return {
      productId: r.productId,
      productCode: r.productCode,
      productName: r.productName,
      unitsSold: Number(r.unitsSold),
      revenue: r.revenue.toFixed(2),
      cost: r.cost.toFixed(2),
      profit: profit.toFixed(2),
      profitMargin: marginPct(profit, r.revenue),
      invoiceCount: Number(r.invoiceCount),
    };
  });
}

export type ClientBreakdownRow = {
  clientId: string;
  clientName: string;
  unitsSold: number;
  revenue: string;
  cost: string;
  profit: string;
  profitMargin: string;
  invoiceCount: number;
};

export async function getClientBreakdown(f: ReportFilters, limit = 25): Promise<ClientBreakdownRow[]> {
  const rows = await prisma.$queryRaw<
    { clientId: string; clientName: string; unitsSold: bigint; revenue: Prisma.Decimal; cost: Prisma.Decimal; invoiceCount: bigint }[]
  >`
    SELECT i."client_id" AS "clientId",
      MAX(i."client_name_snapshot") AS "clientName",
      SUM(ii."quantity")::bigint AS "unitsSold",
      SUM(ii."total") AS revenue,
      SUM(ii."quantity" * p."current_cost") AS cost,
      COUNT(DISTINCT i."id")::bigint AS "invoiceCount"
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    JOIN "products" p ON p."id" = ii."product_id"
    WHERE ${whereSql(f)}
    GROUP BY i."client_id"
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => {
    const profit = r.revenue.sub(r.cost);
    return {
      clientId: r.clientId,
      clientName: r.clientName,
      unitsSold: Number(r.unitsSold),
      revenue: r.revenue.toFixed(2),
      cost: r.cost.toFixed(2),
      profit: profit.toFixed(2),
      profitMargin: marginPct(profit, r.revenue),
      invoiceCount: Number(r.invoiceCount),
    };
  });
}

export type PaymentBreakdownRow = { status: PaymentStatusFilter; revenue: string; invoiceCount: number };

export async function getPaymentBreakdown(f: ReportFilters): Promise<PaymentBreakdownRow[]> {
  const rows = await prisma.$queryRaw<{ status: PaymentStatusFilter; revenue: Prisma.Decimal; invoiceCount: bigint }[]>`
    SELECT i."payment_status" AS status,
      SUM(ii."total") AS revenue,
      COUNT(DISTINCT i."id")::bigint AS "invoiceCount"
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    WHERE ${whereSql(f)}
    GROUP BY i."payment_status"
  `;
  return rows.map((r) => ({ status: r.status, revenue: r.revenue.toFixed(2), invoiceCount: Number(r.invoiceCount) }));
}

export type ReportDetailRow = {
  invoiceId: string;
  invoiceNumber: string;
  createdAt: string;
  clientName: string;
  paymentStatus: PaymentStatusFilter;
  productCode: string;
  productName: string;
  quantity: number;
  price: string;
  total: string;
  cost: string;
  profit: string;
};

export async function getReportDetailRows(f: ReportFilters, limit?: number): Promise<ReportDetailRow[]> {
  const limitSql = limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty;
  const rows = await prisma.$queryRaw<
    {
      invoiceId: string;
      invoiceNumber: string;
      createdAt: Date;
      clientName: string;
      paymentStatus: PaymentStatusFilter;
      productCode: string;
      productName: string;
      quantity: number;
      price: Prisma.Decimal;
      total: Prisma.Decimal;
      currentCost: Prisma.Decimal;
    }[]
  >`
    SELECT i."id" AS "invoiceId",
      i."invoice_number" AS "invoiceNumber",
      i."created_at" AS "createdAt",
      i."client_name_snapshot" AS "clientName",
      i."payment_status" AS "paymentStatus",
      ii."product_code_snapshot" AS "productCode",
      ii."product_name_snapshot" AS "productName",
      ii."quantity" AS "quantity",
      ii."price" AS "price",
      ii."total" AS "total",
      p."current_cost" AS "currentCost"
    FROM "invoice_items" ii
    JOIN "invoices" i ON i."id" = ii."invoice_id"
    JOIN "products" p ON p."id" = ii."product_id"
    WHERE ${whereSql(f)}
    ORDER BY i."created_at" DESC, i."id" DESC
    ${limitSql}
  `;
  return rows.map((r) => {
    const cost = r.currentCost.mul(r.quantity);
    const profit = r.total.sub(cost);
    return {
      invoiceId: r.invoiceId,
      invoiceNumber: r.invoiceNumber,
      createdAt: r.createdAt.toISOString(),
      clientName: r.clientName,
      paymentStatus: r.paymentStatus,
      productCode: r.productCode,
      productName: r.productName,
      quantity: r.quantity,
      price: r.price.toFixed(2),
      total: r.total.toFixed(2),
      cost: cost.toFixed(2),
      profit: profit.toFixed(2),
    };
  });
}

export type SalesReport = {
  summary: ReportSummary;
  granularity: Granularity;
  trend: TrendPoint[];
  byProduct: ProductBreakdownRow[];
  byClient: ClientBreakdownRow[];
  byPaymentStatus: PaymentBreakdownRow[];
  detailRows: ReportDetailRow[];
  detailRowsTruncated: boolean;
};

export async function getSalesReport(
  filters: ReportFilters,
  opts?: { detailLimit?: number; topLimit?: number }
): Promise<SalesReport> {
  const detailLimit = opts?.detailLimit ?? 200;
  const topLimit = opts?.topLimit ?? 15;
  const granularity = pickGranularity(filters.from, filters.toExclusive ?? new Date());

  const [summary, trend, byProduct, byClient, byPaymentStatus, detailRows] = await Promise.all([
    getReportSummary(filters),
    getRevenueTrend(filters, granularity),
    getProductBreakdown(filters, topLimit),
    getClientBreakdown(filters, topLimit),
    getPaymentBreakdown(filters),
    getReportDetailRows(filters, detailLimit + 1),
  ]);

  const detailRowsTruncated = detailRows.length > detailLimit;
  return {
    summary,
    granularity,
    trend,
    byProduct,
    byClient,
    byPaymentStatus,
    detailRows: detailRowsTruncated ? detailRows.slice(0, detailLimit) : detailRows,
    detailRowsTruncated,
  };
}

export type ReportFilterDescription = {
  period: string;
  client: string;
  product: string;
  status: string;
  summary: string;
};

export async function describeReportFilters(parsed: ParsedReportFilters): Promise<ReportFilterDescription> {
  const period =
    parsed.fromInput && parsed.toInput
      ? `${parsed.fromInput} to ${parsed.toInput}`
      : parsed.fromInput
        ? `From ${parsed.fromInput}`
        : parsed.toInput
          ? `Through ${parsed.toInput}`
          : "All time";

  let client = "All clients";
  if (parsed.clientId) {
    const c = await prisma.client.findUnique({ where: { id: parsed.clientId }, select: { name: true } });
    client = c?.name ?? "Unknown client";
  }

  let product = "All products";
  if (parsed.productId) {
    const p = await prisma.product.findUnique({ where: { id: parsed.productId }, select: { name: true } });
    product = p?.name ?? "Unknown product";
  }

  const status = parsed.paymentStatus ? (parsed.paymentStatus === "PAID" ? "Paid only" : "Unpaid only") : "All statuses";

  return { period, client, product, status, summary: `${client} · ${product} · ${status}` };
}
