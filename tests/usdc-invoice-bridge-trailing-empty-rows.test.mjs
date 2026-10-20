import test from "node:test";
import assert from "node:assert/strict";
import {reconcile,SYNTHETIC} from "../docs/usdc-invoice-bridge/engine.mjs";

test("multiple trailing blank lines from actual CSV exports do not discard valid invoices",()=>{
  const invoices=SYNTHETIC.invoices.replaceAll("\n","\r\n")+"\r\n\r\n";
  const events=SYNTHETIC.transfers.replaceAll("\n","\r\n")+"\r\n\r\n";
  const result=reconcile(invoices,events);
  assert.equal(result.summary.invoiceCount,4);
  assert.equal(result.summary.reportedExact,1);
  assert.equal(result.summary.reportedPartial,1);
  assert.equal(result.summary.unreferencedEvents,1);
});

test("blank row inside invoice CSV remains strictly rejected",()=>{
  const bad=SYNTHETIC.invoices.replace("\nINV-DEMO-A", "\n\nINV-DEMO-A");
  assert.throws(()=>reconcile(bad,SYNTHETIC.transfers),/Irregular column count/);
});

test("blank row inside event CSV remains strictly rejected",()=>{
  const bad=SYNTHETIC.transfers.replace("\nINV-DEMO-A", "\n\nINV-DEMO-A");
  assert.throws(()=>reconcile(SYNTHETIC.invoices,bad),/Irregular column count/);
});

test("trailing nonempty malformed row remains rejected",()=>{
  assert.throws(()=>reconcile(SYNTHETIC.invoices+"\nextra,data",SYNTHETIC.transfers),/Irregular column count/);
});
