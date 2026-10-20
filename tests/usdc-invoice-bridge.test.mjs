import test from "node:test";
import assert from "node:assert/strict";
import {reconcile,SYNTHETIC,reportCsv} from "../docs/usdc-invoice-bridge/engine.mjs";
const invoice=SYNTHETIC.invoices;
const transfers=SYNTHETIC.transfers;
const report=()=>reconcile(invoice,transfers);
const inv=(id)=>report().invoices.find(x=>x.invoice_id===id);
const bad=(a,b)=>assert.throws(()=>reconcile(a,b));
test("Synthetic demo: exact/partial/unreferenced/pending all independently visible",()=>{
 const r=report();assert.equal(r.summary.invoiceCount,4);
 assert.equal(r.summary.reportedExact,1);assert.equal(r.summary.reportedPartial,1);
 assert.equal(r.summary.unreferencedEvents,1);assert.equal(r.summary.pendingReported,1);
 assert.equal(r.invoices[0].status,"reported_exact");
 assert.equal(r.invoices[1].reported_difference_usdc,"0.6");
 assert.equal(r.invoices[2].status,"no_allocated_receipt");
 assert.equal(r.invoices[3].status,"pending_only");
 assert.equal(r.manualReview[0].kind,"shared_address_ambiguous");
 assert.deepEqual(r.manualReview[0].candidateInvoiceIds,["INV-DEMO-B","INV-DEMO-C"]);
});
test("No receipt is EVER called verified on-chain",()=>{
 const r=report();assert.match(r.safety,/No RPC, no verified settlement\/finality/i);
 assert.equal(r.networkCalls,0);assert.equal(r.noncustodial,true);
 assert.doesNotMatch(JSON.stringify(r),/"status":"paid"/);
});
test("Pairing uses txHash:logIndex; repeated event keys never double credit",()=>{
 const lines=transfers.split("\n");const extra=lines[1];
 const s=lines.join("\n")+"\n"+extra;
 const result=reconcile(invoice,s);
 assert.equal(result.summary.duplicateEventRows,2);
 assert.equal(result.invoices[0].reported_finalized_usdc,"0");
 assert.ok(result.manualReview.some(x=>x.kind==="duplicate_or_conflicting_transfer_event"));
});
test("Wrong recipient not paid even with invoice_id and reported finality",()=>{
 const mutated=transfers.replace(/INV-DEMO-A,([^,]+),1,0x1{40}/,"INV-DEMO-A,$1,1,0x"+"2".repeat(40));
 const out=reconcile(invoice,mutated);
 assert.equal(out.summary.wrongRecipientEvents,1);
 assert.equal(out.invoices[0].status,"manual_review_required");
 assert.equal(out.invoices[0].reported_finalized_usdc,"0");
});
test("Wrong token chain or decimals are rejected, not silently matched",()=>{
 bad(invoice,transfers.replaceAll("eip155:8453","eip155:1"));
 bad(invoice,transfers.replaceAll("0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913","USDT"));
 bad(invoice,transfers.replace("2.000000","2.0000001"));
});
test("Amount uses exact six-decimal integer math, no floating point approximation",()=>{
 const newInvoice=invoice.replace("2.000000","0.300000");
 const newTransfer=transfers.replace("2.000000","0.100000");
 const splitLine=transfers.split("\n")[1].replace("0x"+"a".repeat(64),"0x"+"f".repeat(64)).replace("2.000000","0.200000");
 const lines=newTransfer.split("\n");
 lines.push(splitLine);
 const out=reconcile(newInvoice,lines.join("\n"));
 assert.equal(out.invoices[0].status,"reported_exact");
 assert.equal(out.invoices[0].reported_finalized_usdc,"0.3");
});
test("Pending transfers never count toward finalized self-reported sum",()=>{
 const newTransfer=transfers.replace("INV-DEMO-A,"+"0x"+"a".repeat(64)+",1,0x"+"1".repeat(40)+",2.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,reported_finalized",
 "INV-DEMO-A,"+"0x"+"a".repeat(64)+",1,0x"+"1".repeat(40)+",2.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,pending");
 const out=reconcile(invoice,newTransfer);
 assert.equal(out.invoices[0].status,"pending_only");
 assert.equal(out.invoices[0].pending_events,1);
});
test("Reused payee address never automatically maps orphan transfers",()=>{
 const out=report();
 assert.equal(out.invoices[2].status,"no_allocated_receipt");
 assert.equal(out.summary.unreferencedEvents,1);
});
test("Unknown invoice references require manual review",()=>{
 const out=reconcile(invoice,transfers.replace("INV-DEMO-A,","INV-NOT-FOUND,"));
 assert.equal(out.summary.unknownInvoiceEvents,1);
 assert.equal(out.invoices[0].status,"no_allocated_receipt");
});
test("Strict header/ragged data requirements reject guesswork",()=>{
 bad(invoice.replace("invoice_id","invoice"),transfers);
 bad(invoice,transfers.replace("log_index","log"));
 bad(invoice.replace("invoice_id","invoice_id,private_key"),transfers);
 bad(invoice,transfers.replace(",reported_finalized",","));
 bad(invoice.replace("invoice_id","Invoice_id"),transfers.replace("invoice_id","invoice_id,Secret"));
 bad(invoice.replace(",eip155:8453,",",Base,"),transfers);
});
test("Bad IDs, amounts, hashes, log index and recipient fail closed",()=>{
 bad(invoice.replace("INV-DEMO-A","=2+2"),transfers);
 bad(invoice,transfers.replace("0x"+"a".repeat(64),"abc"));
 bad(invoice,transfers.replace("1,0x"+"1".repeat(40),"abc,0x"+"1".repeat(40)));
 bad(invoice,transfers.replace("1,0x"+"1".repeat(40),"1,0x"+"0".repeat(40)));
 bad(invoice.replace("2.000000","0.000000"),transfers);
});
test("Duplicate invoice IDs fail before any reconciliation",()=>{
 bad(invoice.replace("INV-DEMO-C","INV-DEMO-B"),transfers);
});
test("CSV quoted cell parsing preserves only authorized defined columns",()=>{
 const out=reconcile(invoice.replace("INV-DEMO-A","\"INV-DEMO-A\""),transfers);
 assert.equal(out.invoices[0].invoice_id,"INV-DEMO-A");
});
test("Export is only safe review metadata, never wallet addresses or transaction hashes",()=>{
 const csv=reportCsv(report());
 assert.match(csv,/invoice_id,status,expected_usdc/);
 assert.doesNotMatch(csv,/0x[0-9a-f]{40,64}/);
 assert.equal(csv.split("\r\n").length,6);
});
test("Malformed over-sized CSV and exotic columns refused",()=>{
 bad(invoice+"x".repeat(70000),transfers);
 bad(invoice,transfers+"\n"+"\n".repeat(600));
});
test("Engine never calls wallet/network/storage",async()=>{
 const {readFile}=await import("node:fs/promises");
 const src=await readFile(new URL("../docs/usdc-invoice-bridge/engine.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|eth_sendTransaction|eth_signTypedData/);
});
