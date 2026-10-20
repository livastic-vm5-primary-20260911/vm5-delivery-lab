import test from "node:test";
import assert from "node:assert/strict";
import {SYNTHETIC,reconcile,evidenceIndexCsv} from "../docs/usdc-invoice-bridge/engine.mjs";

const entries=csv=>csv.trim().split("\r\n").map(x=>x.split(","));
test("explicit event index is a separate opt-in local CSV with all four reported event keys",()=>{
 const csv=evidenceIndexCsv(SYNTHETIC.invoices,SYNTHETIC.transfers);
 const rows=entries(csv);
 assert.equal(rows.length,5);
 assert.equal(rows[0].length,12);
 assert.deepEqual(rows[0],[
 "invoice_id","review_flag","candidate_invoice_status","input_event_status_not_verified",
 "chain","token_contract","tx_hash","log_index","recipient","reported_amount_usdc",
 "source_csv_row","proof_level"
 ]);
 assert.equal(rows[1][0],"INV-DEMO-A");
 assert.equal(rows[1][1],"csv_reference_only_unverified");
 assert.equal(rows[1][2],"reported_exact");
 assert.equal(rows[1][6],"0x"+"a".repeat(64));
 assert.equal(rows[1][7],"1");
 assert.equal(rows[1][11],"self_reported_csv_only_unverified");
 assert.equal(rows[3][0],"");
 assert.equal(rows[3][1],"shared_address_ambiguous_manual");
 assert.equal(rows[4][1],"pending_not_verified");
 assert.equal(rows[4][3],"pending");
 assert(!csv.includes("\n="));
});
test("duplicate event identity is never treated as a distinct paid item",()=>{
 const lines=SYNTHETIC.transfers.split("\n");
 const doubled=[...lines,lines[1]].join("\n");
 const out=evidenceIndexCsv(SYNTHETIC.invoices,doubled);
 const rows=entries(out);
 assert.equal(rows.length,6);
 assert.equal(rows[1][1],"duplicate_event_identity_manual");
 assert.equal(rows[5][1],"duplicate_event_identity_manual");
 assert.equal(reconcile(SYNTHETIC.invoices,doubled).summary.duplicateEventRows,2);
});
test("unknown invoice id and mismatched payee must remain explicit manual review",()=>{
 const e=SYNTHETIC.transfers.split("\n");
 const unknown=e[1].replace("INV-DEMO-A","INV-UNSEEN");
 let rows=entries(evidenceIndexCsv(SYNTHETIC.invoices,[e[0],unknown].join("\n")));
 assert.equal(rows[1][1],"unknown_invoice_id_manual");
 const wrong=e[1].replace("0x1111111111111111111111111111111111111111","0x2222222222222222222222222222222222222222");
 rows=entries(evidenceIndexCsv(SYNTHETIC.invoices,[e[0],wrong].join("\n")));
 assert.equal(rows[1][1],"recipient_mismatch_manual");
});
test("no formula injections, unsafe identity, wrong token, or out-of-scope chain exported",()=>{
 const e=SYNTHETIC.transfers.split("\n");
 const badId=e[1].replace("INV-DEMO-A","=1+1");
 assert.throws(()=>evidenceIndexCsv(SYNTHETIC.invoices,[e[0],badId].join("\n")),/Invoice IDs/);
 const badToken=e[1].replace("0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913","0x1234567890123456789012345678901234567890");
 assert.throws(()=>evidenceIndexCsv(SYNTHETIC.invoices,[e[0],badToken].join("\n")),/canonical Circle Base USDC/);
 const badChain=e[1].replace("eip155:8453","eip155:1");
 assert.throws(()=>evidenceIndexCsv(SYNTHETIC.invoices,[e[0],badChain].join("\n")),/only Base mainnet/);
});
test("empty invoice event never auto allocates even if exactly one payee",()=>{
 const e=SYNTHETIC.transfers.split("\n");
 const withoutInvoice=e[1].replace("INV-DEMO-A,","");
 const out=entries(evidenceIndexCsv(SYNTHETIC.invoices,[e[0],"," + withoutInvoice].join("\n")));
 assert.equal(out[1][0],"");
 assert.equal(out[1][1],"unreferenced_event_manual");
 assert.equal(out[1][2],"not_allocated");
});
