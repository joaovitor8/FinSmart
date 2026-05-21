// Parser de CSV de extrato bancário (Nubank, Itaú, Inter, BB, etc).
// Tolerante: detecta separador, cabeçalhos comuns em PT-BR/EN e formatos de data.

export type ParsedRow = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // sempre positivo
  type: "INCOME" | "EXPENSE"; // inferido pelo sinal original
};

export type ParseResult = {
  rows: ParsedRow[];
  warnings: string[];
};

// --- CSV split que respeita aspas ---
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // aspas escapadas ""
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Detecta `,` ou `;` pelo número de ocorrências na primeira linha não vazia.
function detectSeparator(firstLine: string): string {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

// Normaliza nome de coluna: lowercase + sem acentos + sem espaços extras
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Mapeia cabeçalhos comuns -> nosso campo
const DATE_HEADERS = ["data", "date", "data lancamento", "data movimento", "data da compra"];
const DESC_HEADERS = [
  "descricao",
  "description",
  "histórico",
  "historico",
  "titulo",
  "title",
  "lançamento",
  "lancamento",
  "estabelecimento",
  "memo",
  "categoria",
];
const AMOUNT_HEADERS = ["valor", "amount", "value", "montante", "quantia"];
const TYPE_HEADERS = ["tipo", "type"]; // alguns extratos têm coluna de tipo

// Tenta interpretar uma data em vários formatos comuns
function parseDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  // YYYY-MM-DD (já no formato certo)
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);

  // DD/MM/YYYY ou DD-MM-YYYY
  const br = /^(\d{2})[/-](\d{2})[/-](\d{4})/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  // DD/MM/YY → assume 20YY
  const br2 = /^(\d{2})[/-](\d{2})[/-](\d{2})$/.exec(v);
  if (br2) return `20${br2[3]}-${br2[2]}-${br2[1]}`;

  // ISO com hora
  const iso = new Date(v);
  if (!isNaN(iso.getTime())) {
    return iso.toISOString().slice(0, 10);
  }

  return null;
}

// "1.234,56" → 1234.56 | "1,234.56" → 1234.56 | "-50,00" → -50
function parseAmount(raw: string): number | null {
  let v = raw.trim().replace(/\s/g, "").replace(/[R$ ]/g, "");
  if (!v) return null;

  // Decide se vírgula ou ponto é decimal: o último símbolo encontrado é o decimal
  const lastComma = v.lastIndexOf(",");
  const lastDot = v.lastIndexOf(".");
  if (lastComma > lastDot) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    v = v.replace(/,/g, "");
  }

  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Faz o parse principal
export function parseCsv(text: string): ParseResult {
  const warnings: string[] = [];
  // BOM UTF-8 removido
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], warnings: ["Arquivo vazio"] };

  const sep = detectSeparator(lines[0]);
  const headers = splitCsvLine(lines[0], sep).map(norm);

  // Localiza colunas
  const dateIdx = headers.findIndex((h) => DATE_HEADERS.includes(h));
  const descIdx = headers.findIndex((h) => DESC_HEADERS.includes(h));
  const amountIdx = headers.findIndex((h) => AMOUNT_HEADERS.includes(h));
  const typeIdx = headers.findIndex((h) => TYPE_HEADERS.includes(h));

  if (dateIdx === -1) warnings.push("Coluna de data não encontrada");
  if (descIdx === -1) warnings.push("Coluna de descrição não encontrada");
  if (amountIdx === -1) warnings.push("Coluna de valor não encontrada");
  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return { rows: [], warnings };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], sep);
    const date = parseDate(cells[dateIdx] ?? "");
    const description = (cells[descIdx] ?? "").trim();
    const amountRaw = parseAmount(cells[amountIdx] ?? "");

    if (!date || !description || amountRaw === null) {
      warnings.push(`Linha ${i + 1} ignorada (dados inválidos)`);
      continue;
    }

    // Tipo: usa coluna se existir, senão infere pelo sinal
    let type: "INCOME" | "EXPENSE";
    if (typeIdx !== -1) {
      const raw = norm(cells[typeIdx] ?? "");
      if (["credito", "credit", "entrada", "income", "receita"].includes(raw)) type = "INCOME";
      else if (["debito", "debit", "saida", "expense", "despesa"].includes(raw)) type = "EXPENSE";
      else type = amountRaw < 0 ? "EXPENSE" : "INCOME";
    } else {
      type = amountRaw < 0 ? "EXPENSE" : "INCOME";
    }

    rows.push({
      date,
      description,
      amount: Math.abs(amountRaw),
      type,
    });
  }

  return { rows, warnings };
}

// --- Auto-categorização por palavras-chave ---
// Cada categoria padrão tem um conjunto de keywords. O matching é por substring case-insensitive.
const KEYWORDS: Record<string, string[]> = {
  Alimentação: [
    "ifood", "uber eats", "rappi", "restaurante", "lanchonete", "padaria",
    "mercado", "supermercado", "carrefour", "atacadao", "pao de acucar", "extra",
    "açai", "acai", "pizza", "hamburguer", "burger", "comida",
  ],
  Transporte: [
    "uber", "99", "cabify", "taxi", "metro", "metrô", "onibus", "ônibus",
    "combustivel", "combustível", "posto", "gasolina", "etanol", "estacion",
    "shell", "ipiranga", "br", "pedagio", "pedágio",
  ],
  Moradia: [
    "aluguel", "condominio", "condomínio", "luz", "energia", "agua", "água",
    "gas", "gás", "enel", "cemig", "sabesp", "iptu",
  ],
  Saúde: [
    "farmacia", "farmácia", "drogaria", "droga", "raia", "drogasil",
    "hospital", "clinica", "clínica", "consulta", "medico", "médico", "dentista",
    "plano de saude", "unimed",
  ],
  Educação: [
    "curso", "escola", "faculdade", "universidade", "udemy", "alura", "coursera",
    "livro", "amazon livro",
  ],
  Lazer: [
    "cinema", "ingresso", "show", "evento", "spotify", "deezer", "youtube",
    "games", "playstation", "xbox", "steam",
  ],
  Compras: [
    "amazon", "mercado livre", "shopee", "magazine", "magalu", "americanas",
    "shopping", "loja", "renner", "zara",
  ],
  Streaming: [
    "netflix", "prime video", "disney", "hbo", "max", "globoplay", "apple tv",
    "paramount",
  ],
  Internet: ["vivo fibra", "claro net", "oi fibra", "tim live", "internet"],
  Academia: ["academia", "smart fit", "smartfit", "bio ritmo", "bluefit"],
  Salário: ["salario", "salário", "pagamento empresa", "folha"],
  Investimento: ["dividendos", "rendimento", "aplicacao", "aplicação", "tesouro"],
};

// Tenta achar a categoria mais provável (retorna o ID se achar uma do usuário com nome correspondente)
export function suggestCategory(
  description: string,
  type: "INCOME" | "EXPENSE",
  categories: { id: string; name: string; type: "INCOME" | "EXPENSE" | "BOTH" }[],
): string | null {
  const desc = norm(description);

  // 1) Match por keyword
  for (const [catName, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some((kw) => desc.includes(norm(kw)))) {
      const cat = categories.find(
        (c) =>
          norm(c.name) === norm(catName) &&
          (c.type === "BOTH" || c.type === type),
      );
      if (cat) return cat.id;
    }
  }

  // 2) Fallback: "Outros" (BOTH) ou primeira categoria compatível
  const outros = categories.find((c) => norm(c.name) === "outros");
  if (outros) return outros.id;
  const firstCompat = categories.find((c) => c.type === "BOTH" || c.type === type);
  return firstCompat?.id ?? null;
}
