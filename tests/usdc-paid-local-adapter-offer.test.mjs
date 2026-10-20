import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const at=p=>readFile(new URL(p,import.meta.url),"utf8");
const issue="https://github.com/livastic-vm5-primary-20260911/vm5-delivery-lab/issues/new?template=base-usdc-paid-csv-adapter-pilot.yml";
test("The distinct paid CSV adapter page has a canonical working target",async()=>{
 const s=await at("../docs/usdc-payout-csv/custom-adapter.html");
 assert.match(s,/<title>Base USDC CSV Import Adapter/);
 assert.match(s,/rel="canonical" href="https:\/\/livastic-vm5-primary-20260911\.github\.io\/vm5-delivery-lab\/usdc-payout-csv\/custom-adapter\.html"/);
});
test("Paid pilot is a scoped 29-USDC indicative quote not a charged transaction",async()=>{
 const s=await at("../docs/usdc-payout-csv/custom-adapter.html");
 assert.match(s,/29 USDC/);
 assert.match(s,/Illustrative starting quote/);
 assert.match(s,/only after written agreement/);
 assert.match(s,/No obligation to buy/);
 assert.match(s,/not a current paid order/);
});
test("Safe PUBLIC no-cost buyer GitHub issue template accepts synthetic examples",async()=>{
 const h=await at("../docs/usdc-payout-csv/custom-adapter.html");
 const y=await at("../.github/ISSUE_TEMPLATE/base-usdc-paid-csv-adapter-pilot.yml");
 assert.equal(h.split('href="'+issue+'"').length-1,1);
 assert.match(y,/public, no-cost inquiry/i);
 for(const k of ["synthetic-input-headers","expected-canonical-output","acceptance","indicative-budget"])assert.ok(y.includes("id: "+k),k);
});
test("No wallet signing/transaction checkout or private client data on public pilot site",async()=>{
 const h=await at("../docs/usdc-payout-csv/custom-adapter.html");
 assert.match(h,/script-src 'none'; connect-src 'none'/);
 assert.match(h,/Never required for scoping/i);
 assert.match(h,/not required to use/i);
 assert.match(h,/does not check EIP-55 checksums, watch finality, take custody/i);
 assert.ok(!/eth_sendTransaction|window\.ethereum|fetch\s*\(|XMLHttpRequest|privateKey|wallet_requestPermissions/.test(h));
});
test("Offline pilot only maps one synthetic payout CSV and includes tests and correction",async()=>{
 const h=await at("../docs/usdc-payout-csv/custom-adapter.html");
 assert.match(h,/One source CSV schema/);
 assert.match(h,/10\+ runnable local checks/);
 assert.match(h,/One consolidated in-scope revision/);
 assert.match(h,/wallet_address,usdc_amount,network,reference/);
});
test("Pilot price is separated from free checker and optional 0.005-USDC x402 generic API",async()=>{
 const h=await at("../docs/usdc-payout-csv/custom-adapter.html");
 assert.match(h,/free browser checker/i);
 assert.match(h,/0\.005 USDC per-call generic CSV quality API/);
 assert.match(h,/format-conversion development service/);
});
test("The original free product genuinely links to the paid quote while remaining free",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/href="custom-adapter\.html"/);
 assert.match(h,/29 native Base USDC indicative/);
 assert.match(h,/free written quote/);
 assert.match(h,/connect-src 'none'/);
});
test("Sitemap indexes one custom import adapter and README does not call a proposal a sale",async()=>{
 const s=await at("../docs/sitemap.xml");
 const r=await at("../README.md");
 assert.equal(s.split("<loc>https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-payout-csv/custom-adapter.html</loc>").length-1,1);
 assert.match(r,/no 29 USDC order, buyer willingness/i);
 assert.match(r,/Existing VM3 manual receipt QA work is a different product/);
});
test("The public issue explicitly forbids private CSV data, wallet transfers and premature payment",async()=>{
 const s=await at("../.github/ISSUE_TEMPLATE/base-usdc-paid-csv-adapter-pilot.yml");
 for(const text of ["not a purchase","fake row","Never paste real payroll","No money should be sent","No live wallet integration","one consolidated in-scope correction"]){
  assert.ok(s.toLowerCase().includes(text.toLowerCase()),text);
 }
});
