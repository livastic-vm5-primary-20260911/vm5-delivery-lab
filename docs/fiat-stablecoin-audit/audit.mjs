/*
 * Fiat-funded stablecoin payout audit: deterministic LOCAL CSV preflight.
 * Does not verify provider attestations, banking, transactions, KYC or accounting.
 * One owner; independent synthetic examples only. No network calls or wallet access.
 */
const MAX_BYTES = 65536;
const MAX_ROWS = 500;
const MAX_COLUMNS = 24;
const AMOUNT_RE = /^(0|[1-9]\d{0,11})(?:\.(\d{1,6}))?$/;
const PAID = new Set(["paid", "completed", "settled", "finalized"]);
const FUNDED = new Set(["funded", "completed", "settled"]);
const SCHEMAS = {
  funding: ["batch_id", "amount", "currency", "status"],
  invoices: ["invoice_id", "payout_id", "amount", "currency"],
  payouts: ["payout_id", "invoice_id", "batch_id", "sent_amount", "sent_currency", "received_amount", "received_currency", "status"]
};
const normalize = value => String(value || "").trim();
const code = value => normalize(value).toUpperCase();
const cleanStatus = value => normalize(value).toLowerCase();

export function parseCsv(text, kind) {
  if (!SCHEMAS[kind]) throw new Error("Unknown input type");
  if (typeof text !== "string" || !text.trim()) throw new Error(kind + ": CSV is empty");
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error(kind + ": 64 KiB limit exceeded");
  if (text.includes("\u0000")) throw new Error(kind + ": NUL byte rejected");
  const s = text.replace(/^\uFEFF/, "");
  const records = [];
  let fields = [], field = "", quoted = false, quoteClosed = false;
  const pushField = () => { fields.push(field); field = ""; quoteClosed = false; if (fields.length > MAX_COLUMNS) throw new Error(kind + ": too many columns"); };
  const pushRow = () => { pushField(); if (fields.some(v => v !== "")) records.push(fields); fields = []; if (records.length > MAX_ROWS + 1) throw new Error(kind + ": 500-row limit exceeded"); };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i+1] === '"') { field += '"'; i++; } else { quoted = false; quoteClosed = true; }
      } else { field += c; }
      continue;
    }
    if (c === '"') {
      if (field !== "" || quoteClosed) throw new Error(kind + ": malformed quote at character " + (i+1));
      quoted = true;
    } else if (c === ",") { pushField(); }
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && s[i+1] === "\n") i++;
      pushRow();
    } else {
      if (quoteClosed) throw new Error(kind + ": trailing data after quoted cell");
      field += c;
    }
    if (field.length > 16384) throw new Error(kind + ": oversized cell");
  }
  if (quoted) throw new Error(kind + ": unterminated quoted cell");
  if (fields.length || field || quoteClosed) pushRow();
  if (!records.length) throw new Error(kind + ": missing header");
  const head = records.shift().map(x => x.trim().toLowerCase());
  if (new Set(head).size !== head.length) throw new Error(kind + ": duplicated CSV column");
  for (const h of SCHEMAS[kind]) if (!head.includes(h)) throw new Error(kind + ": required column missing: " + h);
  const rows = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    if (row.length !== head.length) throw new Error(kind + ": data row " + (i+2) + " has wrong number of columns");
    const object = {row: i+2};
    head.forEach((h,j) => { object[h] = normalize(row[j]); });
    rows.push(object);
  }
  return rows;
}
export function toMicros(s) {
  const value = normalize(s);
  const m = AMOUNT_RE.exec(value);
  if (!m) return null;
  const amount = BigInt(m[1]) * 1000000n + BigInt((m[2] || "").padEnd(6,"0"));
  return amount > 0n ? amount : null;
}
export function audit({funding, invoices, payouts}) {
  const f = parseCsv(funding, "funding"), i = parseCsv(invoices, "invoices"), p = parseCsv(payouts, "payouts");
  const issues = [], batches = [], details = [];
  const add = (kind, source, row, message) => issues.push({kind, source, row, message});
  const indexes = {};
  for (const [name, rows, key] of [["funding", f, "batch_id"],["invoices",i,"invoice_id"],["payouts",p,"payout_id"]]) {
    const map = new Map(); indexes[name] = map;
    for (const r of rows) {
      if (!r[key]) { add("missing_reference", name, r.row, "Required opaque ID missing"); continue; }
      if (r[key].length > 120) add("long_reference", name, r.row, "Reference exceeds 120 characters");
      if (/^[=+@-]/.test(r[key])) add("spreadsheet_formula_risk",name,r.row,"ID could execute as formula when opened in spreadsheet");
      if (map.has(r[key])) add("duplicate_id", name, r.row, "Stable ID also occurs on another input row");
      else map.set(r[key],r);
    }
  }
  const validMoney = (row, source, key) => {
    const num = toMicros(row[key]);
    if (num === null) add("invalid_amount",source,row.row,"Invalid nonpositive or >6-decimal amount in " + key);
    return num;
  };
  for (const r of f) validMoney(r,"funding","amount");
  for (const r of i) validMoney(r,"invoices","amount");
  for (const r of p) {
    validMoney(r,"payouts","sent_amount");
    validMoney(r,"payouts","received_amount");
    if (!code(r.sent_currency) || !code(r.received_currency)) add("missing_currency","payouts",r.row,"Currency code missing");
  }
  const usedPayouts = new Set();
  let consistent = 0;
  for (const inv of i) {
    const pmt = indexes.payouts.get(inv.payout_id);
    const beginning = issues.length;
    if (!inv.payout_id || !pmt) {
      add("missing_payout","invoices",inv.row,"No payout found for invoice's stable payout ID");
      details.push({invoiceRow:inv.row,payoutRow:null,state:"REVIEW_REQUIRED"});
      continue;
    }
    usedPayouts.add(pmt);
    if (!inv.invoice_id || inv.invoice_id !== pmt.invoice_id) add("reference_mismatch","invoices",inv.row,"Invoice and payout invoice references differ");
    if (!PAID.has(cleanStatus(pmt.status))) add("not_final_payout","payouts",pmt.row,"Payout status is not reported paid/completed/settled/finalized");
    if (code(inv.currency) !== code(pmt.sent_currency)) {
      add("invoice_currency_mismatch","invoices",inv.row,"Invoice currency differs from payout sent currency; FX basis unverified");
    } else {
      const expected = toMicros(inv.amount), actual = toMicros(pmt.sent_amount);
      if (expected !== null && actual !== null && expected !== actual) add("invoice_amount_mismatch","invoices",inv.row,"Invoiced amount differs from payout sent amount");
    }
    const batch = indexes.funding.get(pmt.batch_id);
    if (!pmt.batch_id || !batch) add("unfunded_or_unknown_batch","payouts",pmt.row,"Payout has no matching batch funding record");
    else if (!FUNDED.has(cleanStatus(batch.status))) add("batch_not_funded","funding",batch.row,"Batch not reported completed/funded/settled");
    if (issues.length === beginning) consistent++;
    details.push({invoiceRow:inv.row,payoutRow:pmt.row,state:issues.length===beginning?"REPORTED_MATCH_NOT_VERIFIED":"REVIEW_REQUIRED"});
  }
  for (const r of p) if (!usedPayouts.has(r)) add("payout_without_invoice","payouts",r.row,"Payout has no linked invoice row");
  for (const b of f) {
    const belonging = p.filter(r=>r.batch_id===b.batch_id);
    if (belonging.length === 0) add("funding_batch_without_payout","funding",b.row,"No payout rows linked to batch");
    const cross = belonging.filter(r=>code(r.sent_currency)!==code(b.currency));
    if (cross.length) add("fx_not_reconciled","funding",b.row,"Bank-funded currency differs from payout sent currency; no FX rate evidence");
    const comparable = belonging.every(r=>code(r.sent_currency)===code(b.currency));
    const settled = belonging.every(r=>PAID.has(cleanStatus(r.status)));
    const sum = belonging.reduce((v,r)=>v+(toMicros(r.sent_amount)||0n),0n);
    const fundingAmount = toMicros(b.amount);
    batches.push({
      fundingRow:b.row, payouts:belonging.length, status:cleanStatus(b.status),
      crossCurrency:cross.length>0, sameCurrencyComparable:comparable && settled && !!fundingAmount,
      possibleDifference:comparable && settled && fundingAmount !== null ? (sum===fundingAmount?"same reported amount":"different reported amount (fees, FX, or unmatched rows possible)") : "not comparable"
    });
  }
  const counts = {};
  for (const x of issues) counts[x.kind] = (counts[x.kind]||0)+1;
  return {summary:{fundingRows:f.length,invoiceRows:i.length,payoutRows:p.length,reportedConsistent:consistent,reviewIssues:issues.length},issueCounts:counts,issues,details,batches};
}
export function summaryCsv(result) {
  const header="source,row,exception_kind";
  const value = v => '"' + String(v).replaceAll('"','""') + '"';
  return header+"\n"+result.issues.map(x=>[x.source,x.row,x.kind].map(value).join(",")).join("\n")+"\n";
}
