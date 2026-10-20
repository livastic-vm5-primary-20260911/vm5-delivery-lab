import test from "node:test";
import assert from "node:assert/strict";
import {parseCsv, toMicros, audit, summaryCsv} from "../docs/fiat-stablecoin-audit/audit.mjs";
const F="batch_id,amount,currency,status\nB1,500,EUR,funded";
const I="invoice_id,payout_id,amount,currency\nINV1,P1,100,EUR";
const P="payout_id,invoice_id,batch_id,sent_amount,sent_currency,received_amount,received_currency,status\nP1,INV1,B1,100,EUR,110,USDC,paid";
const run=(f=F,i=I,p=P)=>audit({funding:f,invoices:i,payouts:p});
test("synthetic paid record has only operator-reported match",()=>{
  const r=run(); assert.equal(r.summary.reportedConsistent,1);
  assert.equal(r.summary.reviewIssues,0);
  assert.equal(r.details[0].state,"REPORTED_MATCH_NOT_VERIFIED");
});
test("fiat same currency is comparable only when all payouts final",()=>{assert.equal(run().batches[0].sameCurrencyComparable,true)});
test("fx gap is not an automatic discrepancy",()=>{
  const r=run(F,I,P.replace(",100,EUR,110,",",100,USDC,110,"));
  assert.ok(r.issueCounts.fx_not_reconciled); assert.equal(r.batches[0].sameCurrencyComparable,false);
});
test("invoice amount mismatch detected exactly",()=>{
  const r=run(F,I.replace(",100,EUR",",100.000001,EUR"));
  assert.equal(r.issueCounts.invoice_amount_mismatch,1);
});
test("reported payment without funded batch is not reconciled",()=>{
  const r=run(F.replace("funded","pending"));
  assert.equal(r.issueCounts.batch_not_funded,1);
});
test("pending payout never clears invoice",()=>{
  const r=run(F,I,P.replace(",paid",",pending"));
  assert.equal(r.issueCounts.not_final_payout,1);
});
test("unreferenced payout is flagged",()=>{
  const r=run(F,I,P+"\nP2,INV2,B1,12,EUR,13,USDC,paid");
  assert.equal(r.issueCounts.payout_without_invoice,1);
});
test("duplicate payout IDs flagged",()=>{
  const r=run(F,I,P+"\nP1,INV2,B1,20,EUR,22,USDC,paid");
  assert.equal(r.issueCounts.duplicate_id,1);
});
test("missing invoice payout flagged",()=>{
  const r=run(F,I.replace("P1","P999"),P);
  assert.equal(r.issueCounts.missing_payout,1);
});
test("outgoing invoice vs received USD coin does not imply exchange rate",()=>{
  const r=run(F,I,P.replace("110,USDC","200,USDT"));
  assert.equal(r.summary.reportedConsistent,1);
});
test("RFC4180 quoted commas and double-quotes",()=>{
  const rows=parseCsv('batch_id,amount,currency,status\n"ABC,""7""",20,USD,funded',"funding");
  assert.equal(rows[0].batch_id,'ABC,"7"');
});
test("RFC4180 quoted newline works",()=>{
  const rows=parseCsv('batch_id,amount,currency,status\n"ABC\n7",20,USD,funded',"funding");
  assert.equal(rows.length,1);
});
test("quotes after text are forbidden",()=>{assert.throws(()=>parseCsv('batch_id,amount,currency,status\nABC"X,20,USD,funded',"funding"),/malformed/)});
test("UTF8 BOM and CRLF accepted",()=>{assert.equal(parseCsv("\uFEFF"+F.replace("\n","\r\n"),"funding").length,1)});
test("repeated header blocked",()=>{assert.throws(()=>parseCsv("batch_id,batch_id,amount,currency,status\nX,X,1,USD,funded","funding"),/duplicated/)});
test("bad record shape rejected",()=>{assert.throws(()=>parseCsv(F+",EXTRA","funding"),/wrong number/)});
test("missing required header rejected",()=>{assert.throws(()=>parseCsv("batch_id,amount,currency\nB1,3,USD","funding"),/required column/)});
test("oversize input rejected",()=>{assert.throws(()=>parseCsv(F+"\n"+ "A".repeat(70000),"funding"),/64 KiB/)});
test("bad precision and scientific format rejected",()=>{assert.equal(toMicros("1.0000001"),null);assert.equal(toMicros("1e3"),null)});
test("integer exact 6 decimal math",()=>{assert.equal(toMicros("1.000001"),1000001n);assert.equal(toMicros("0"),null)});
test("export has row index only, never payment identifiers",()=>{
  const r=run(F,I.replace("P1","PRIVATE-ID"),P);
  const csv=summaryCsv(r);
  assert.match(csv,/missing_payout/);assert.ok(!csv.includes("PRIVATE-ID"));assert.ok(!csv.includes("INV1"));
});
test("formula-like IDs flagged",()=>{
  const r=run(F.replace("B1","=SUM(1)"));
  assert.equal(r.issueCounts.spreadsheet_formula_risk,1);
});
test("ambiguous wrong invoice reference flagged",()=>{
  const r=run(F,I,P.replace("P1,INV1,","P1,INVX,"));
  assert.equal(r.issueCounts.reference_mismatch,1);
});
test("missing batch blocked",()=>{
  const r=run(F,I,P.replace(",B1,",",UNKNOWN,"));
  assert.equal(r.issueCounts.unfunded_or_unknown_batch,1);
});
test("reordered extra columns supported",()=>{
  assert.equal(parseCsv("currency,status,batch_id,amount,comment\nUSD,funded,B1,22,test","funding")[0].amount,"22");
});
