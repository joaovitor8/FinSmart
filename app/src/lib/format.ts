// Helpers de formatação (BR).

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Converte uma data ISO para "dd/MM/yyyy".
export function formatDateBR(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Converte "YYYY-MM-DD" do <input type="date"> para Date em UTC meio-dia.
// Usar meio-dia evita o pulo de fuso para o dia anterior.
export function dateInputToUTC(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T12:00:00.000Z`);
}

// Inverso: Date -> "YYYY-MM-DD" para preencher input.
export function dateToInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}
