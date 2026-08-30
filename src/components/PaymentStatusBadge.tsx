const LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  CREDITED: "Credited",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const c = status === "PAID" ? "badge-paid" : status === "CREDITED" ? "badge-neutral" : "badge-unpaid";
  const label = LABELS[status] ?? status;
  return <span className={`badge ${c}`}>{label}</span>;
}
