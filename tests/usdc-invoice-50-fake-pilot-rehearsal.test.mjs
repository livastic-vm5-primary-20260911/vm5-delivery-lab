import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {reconcile,reportCsv} from "../docs/usdc-invoice-bridge/engine.mjs";
const root=new URL("../docs/usdc-invoice-bridge/",import.meta.url);
const fixtures={
 invoices:new URL("examples/pilot-50-synthetic-invoices.csv",root),
 transfers:new URL("examples/pilot-50-synthetic-reported-transfers.csv",root)
};
async function readData(){const [a,b]=await Promise.all([readFile(fixtures.invoices,"utf8"),readFile(fixtures.transfers,"utf8")]);return {a,b};}
test("50/50 purely fictional records are independently reproducible using the EXISTING offline matcher",async()=>{
 const {a,b}=await readData();
 assert.equal(a.split("\n").filter(Boolean).length,51);
 assert.equal(b.split("\n").filter(Boolean).length,51);
 const result=reconcile(a,b);
 assert.equal(result.summary.invoiceCount,50);
 assert.equal(result.summary.transferRows,50);
 assert.equal(result.summary.reportedExact,35);
 assert.equal(result.summary.reportedPartial,4);
 assert.equal(result.summary.needsManualReview,2);
 assert.equal(result.summary.pendingReported,3);
 assert.equal(result.summary.duplicateEventRows,2);
 assert.equal(result.summary.unreferencedEvents,2);
 assert.equal(result.summary.wrongRecipientEvents,2);
 assert.equal(result.summary.unknownInvoiceEvents,0);
 assert.equal(result.invoices.filter(x=>x.status==="reported_overpayment").length,2);
 assert.equal(result.invoices.filter(x=>x.status==="no_allocated_receipt").length,4);
 assert.equal(result.networkCalls,0);
 assert.equal(result.noncustodial,true);
});
test("100% synthetic identifiers; no customer identity, real transfer hash, credentials, wallet connection or financial certification",async()=>{
 const {a,b}=await readData();
 assert.match(a,/PILOT-DEMO-050/);
 assert.match(b,/,reported_finalized/);
 assert.ok(b.includes(",pending"));
 assert.doesNotMatch(a+"\n"+b,/@|\+82|first_name|email|\bseed\b|private_key|payment-signature|authorization|api[_-]?key/i);
 const hashes=b.trim().split("\n").slice(1).map(x=>x.split(",")[1]);
 assert.equal(new Set(hashes).size,49,"one deliberately fictional duplicated onchain event identity");
 assert.ok(hashes.every(h=>/^0x(?:abcdefff){7}[0-9a-f]{8}$/.test(h)));
 assert.ok(a.trim().split("\n").slice(1).every(row=>row.includes("eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913")));
});
test("downloadable report contains review status, never original recipient or transaction hashes",async()=>{
 const {a,b}=await readData();
 const out=reconcile(a,b);
 const csv=reportCsv(out);
 assert.equal(csv.trim().split(/\r?\n/).length,51);
 assert.match(csv,/reported_exact/);
 assert.match(csv,/reported_partial/);
 assert.match(csv,/manual_review_required/);
 assert.doesNotMatch(csv,/0x[0-9a-f]{40,64}/i);
 assert.doesNotMatch(csv,/@|wallet|private_key|tx_hash/i);
});
test("manual review explicitly flags the shared address, duplicate event and recipient mismatches",async()=>{
 const {a,b}=await readData();
 const result=reconcile(a,b);
 const counts=result.manualReview.reduce((m,e)=>(m[e.kind]=(m[e.kind]||0)+1,m),{});
 assert.equal(counts.shared_address_ambiguous,2);
 assert.equal(counts.recipient_mismatch,2);
 assert.equal(counts.duplicate_or_conflicting_transfer_event,1);
 const files=await readFile(new URL("index.html",root),"utf8");
 for(const file of ["pilot-50-synthetic-invoices.csv","pilot-50-synthetic-reported-transfers.csv"]){
  assert.equal(files.split(file).length-1,1,"one clear download link per example file");
 }
 assert.match(files,/fictional.*50/i);
 assert.match(files,/not.*onchain/i);
});
