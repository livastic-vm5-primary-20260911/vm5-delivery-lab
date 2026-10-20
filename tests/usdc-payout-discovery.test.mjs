import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const at=async(path)=>readFile(new URL(path,import.meta.url),"utf8");
test("homepage promotes actual free preview via relevant distinct path",async()=>{
 const h=await at("../docs/index.html");
 assert.match(h,/href="usdc-payout-csv\/"/);
 assert.match(h,/Free local Base USDC payout-list check/);
 assert.equal((h.match(/href="usdc-payout-csv\/"/g)||[]).length,2);
});
test("XML sitemap has exactly one correct canonical service route",async()=>{
 const s=await at("../docs/sitemap.xml"), canonical="https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-payout-csv/";
 assert.equal(s.split(canonical).length-1,1);
 assert.match(s,/2026-10-20/);
});
test("browser checker is privacy-preserving and explicitly no financial settlement",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 for(const x of ["No private","no uploads","never", "wallet"]){ /* wording differs; invariant below */ }
 assert.match(h,/zero uploads|never uploaded/i);
 assert.match(h,/does\s*<strong>not<\/strong>\s*purchase the x402 API/i);
 assert.match(h,/not<\/strong> an on-chain payout-address verifier/i);
 assert.match(h,/0\.005 USDC/);
 assert.match(h,/0x6b01efA0705E91a7aca54271510bf9e594717f34/i);
});
test("CSP explicitly denies all network connections",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/connect-src 'none'/);
 assert.match(h,/default-src 'none'/);
 assert.match(h,/script-src 'self'/);
});
test("no file upload form or unaudited external script",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.ok(!/<form\b/i.test(h));
 assert.match(h,/type="file"/);
 assert.match(h,/type="module" src="app\.mjs"/);
 assert.ok(!/script.+src="https:/.test(h));
});
test("structured data labels free tool, not paid guaranteed monetization",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/"isAccessibleForFree": true/);
 assert.match(h,/"price": "0"/);
 assert.match(h,/"SoftwareApplication"/);
});
test("readable README flags tip distinct from x402 paid product",async()=>{
 const r=await at("../README.md");
 assert.match(r,/Voluntary native Base Circle USDC support is explicitly a tip/);
 assert.match(r,/NOT payment for the distinct existing/);
});
test("new app only consumes own checker and never invokes payout or APIs",async()=>{
 const m=await at("../docs/usdc-payout-csv/app.mjs");
 assert.match(m,/\.\/checker\.mjs/);
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|ethereum\.request|sendTransaction/.test(m));
});
