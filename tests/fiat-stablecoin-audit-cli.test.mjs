import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const root="docs/fiat-stablecoin-audit";
const files=[
  root+"/fixtures/fictional-bank-batches.csv",
  root+"/fixtures/fictional-invoices.csv",
  root+"/fixtures/fictional-processor-payouts.csv"
];
const run=(extra=[],inputs=files)=>spawnSync(process.execPath,[root+"/cli.mjs",
 "--funding",inputs[0],"--invoices",inputs[1],"--payouts",inputs[2],...extra],
 {encoding:"utf8",timeout:8000,env:{PATH:process.env.PATH}});
test("offline CLI JSON finds 6 reproducible fictional exceptions with no identifiers",()=>{
 const p=run();
 assert.equal(p.status,0);
 assert.equal(p.stderr,"");
 const j=JSON.parse(p.stdout);
 assert.equal(j.reviewFindings,6);
 assert.equal(j.reportedConsistentInvoices,1);
 assert.equal(j.fundingRows,2);assert.equal(j.invoiceRows,5);
 assert.equal(j.payoutRows,6);
 assert.equal(j.sourcesUploaded,0);assert.equal(j.walletOperations,0);
 assert.equal(j.issueCounts.invoice_amount_mismatch,1);
 assert.equal(j.issueCounts.fx_not_reconciled,1);
 assert.equal(j.issueCounts.batch_not_funded,1);
 assert.ok(!p.stdout.includes("INV-001"));
 assert.ok(!p.stdout.includes("P-006"));
 assert.ok(!p.stdout.includes("B-OCT"));
 assert.ok(!p.stdout.includes("0x"));
});
test("CLI machine CSV outputs only safe row numbers and exception codes",()=>{
 const p=run(["--format","csv"]);assert.equal(p.status,0);
 assert.match(p.stdout,/^source,row,exception_kind\n/);
 assert.match(p.stdout,/invoice_amount_mismatch/);
 assert.ok(!/INV-|P-0|B-OCT|USDT/.test(p.stdout));
});
test("strict mode exits 1 on findings, not fake paid status",()=>{
 const p=run(["--strict"]);assert.equal(p.status,1);
 assert.equal(JSON.parse(p.stdout).walletOperations,0);
});
test("invalid arguments return code2 without input paths, key strings or payloads",()=>{
 const p=spawnSync(process.execPath,[root+"/cli.mjs","--funding","password_secret.csv"],{encoding:"utf8"});
 assert.equal(p.status,2);
 assert.ok(!p.stderr.includes("password_secret.csv"));
});
test("unreadable local source never prints path, secrets or data",()=>{
 const p=run([],["/nonexistent-secret/path.csv",files[1],files[2]]);
 assert.equal(p.status,2);assert.ok(!p.stderr.includes("nonexistent-secret"));assert.equal(p.stdout,"");
});
test("reject huge input using file stat, never echo it",()=>{
 const temp=mkdtempSync(join(tmpdir(),"vm5-fiato-"));
 try{
  const f=join(temp,"oversized.csv");writeFileSync(f,"secret"+("x".repeat(70000)));
  const p=run([],[f,files[1],files[2]]);
  assert.equal(p.status,2);assert.ok(!p.stderr.includes("secret"));assert.equal(p.stdout,"");
 }finally{rmSync(temp,{recursive:true,force:true});}
});
test("help text documents local-only and 3 independent sources",()=>{
 const p=spawnSync(process.execPath,[root+"/cli.mjs","--help"],{encoding:"utf8"});
 assert.equal(p.status,0);assert.match(p.stdout,/Offline contractor fiat-to-stablecoin/);
 assert.match(p.stdout,/--funding/);assert.match(p.stdout,/--invoices/);assert.match(p.stdout,/--payouts/);
 assert.match(p.stdout,/NOT confirmed bank funding/);
});
