import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const at=async path=>readFile(new URL(path,import.meta.url),"utf8");
const vm3="https://livastic-vm3-primary-tmp-260920.github.io/defi-payment-proof-qa/guides/base-usdc-merchant-ledger.html";
test("Free Base USDC browser preflight exposes EXACT same-owner local post-payment receipt review link",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.equal(h.split('href="'+vm3+'"').length-1,1);
 assert.match(h,/another real crypto-ops problem: after payment/i);
});
test("CLI free guide also links post-payment candidate receipt checks exactly once",async()=>{
 const h=await at("../docs/usdc-payout-csv/cli.html");
 assert.equal(h.split('href="'+vm3+'"').length-1,1);
 assert.match(h,/Was the transfer actually completed/);
});
test("Post-payout tool is honestly presented as SAME owner, not two fake independent customers",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/same-owner VM3 project/);
 assert.match(h,/your supplied CSV only/);
});
test("VM3 CSV ledger is explicitly candidate unverified and does not falsely claim RPC or settlement",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/candidate_unverified/);
 assert.match(h,/without RPC, wallet access or transfers/);
 assert.match(h,/not.*prove actual on-chain settlement/);
});
test("No unauthorized wallet signing, transfer, or additional client requests introduced",async()=>{
 const c=await at("../docs/usdc-payout-csv/checker.mjs");
 const a=await at("../docs/usdc-payout-csv/app.mjs");
 for(const s of [c,a]){
  assert.ok(!/\bfetch\s*\(|signTransaction|eth_sendTransaction|wallet\.request|XMLHttpRequest/.test(s));
 }
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/connect-src 'none'/);
 assert.match(h,/never uploaded by this page/i);
});
test("Crucial existing real paid buyer CTA remains separate from local receipt review",async()=>{
 const h=await at("../docs/usdc-payout-csv/index.html");
 assert.match(h,/Optional human checkout · 0\.005 Base USDC/);
 assert.match(h,/does not validate recipients or execute payouts/);
});
