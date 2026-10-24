import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const document = fs.readFileSync(path.join(root,"docs/verified-x402-apis/index.html"),"utf8");
const home = fs.readFileSync(path.join(root,"docs/index.html"),"utf8");
const robot = fs.readFileSync(path.join(root,"docs/sitemap.xml"),"utf8");
const llms = fs.readFileSync(path.join(root,"docs/llms.txt"),"utf8");
const readme = fs.readFileSync(path.join(root,"README.md"),"utf8");
const matches = (regex) => [...document.matchAll(regex)].map((m)=>m[1]||m[0]);
const soldRoutes = [
 "/v1/tapeout-cpu0-report",
 "/v1/btc-funding-four-venues",
 "/v1/tapeout-cpu0-diff",
 "/v1/aave-base-proxy-facts",
 "/v1/erc20-calldata-preflight",
 "/v1/erc20-event-preflight",
 "/v1/base-usdc-allowance",
 "/v1/nft-operator-calldata-preflight"
];

test("Eight honest fixed distinct original VM5 PayAPI listings; no other seller's offering",()=>{
 const cards=matches(/<article class="sku" aria-labelledby="sku-\d+">/g);
 assert.equal(cards.length,8);
 const listings=matches(/href="(https:\/\/payapi\.market\/api\/[^"]+)"[^>]*class="cta-primary"/g);
 const challenges=matches(/href="(https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/[^"]+)"[^>]*>Inspect the unsigned x402 quote/g);
 assert.equal(listings.length,8);
 assert.equal(challenges.length,8);
 assert.equal(new Set(listings).size,8);
 assert.equal(new Set(challenges).size,8);
 assert.deepEqual(new Set(challenges.map(s=>new URL(s).pathname)),new Set(soldRoutes));
 assert(!document.includes("https://payapi.market/provider/login?token="));
});
test("Exactly eight unique x402 Base canary source transactions, all distinct",()=>{
 const tx=matches(/href="(https:\/\/basescan\.org\/tx\/0x[0-9a-f]{64})"/g);
 assert.equal(tx.length,8);
 assert.equal(new Set(tx).size,8);
 assert(document.includes("0.075 USDC"));
 assert.equal(matches(/PAYAPI VENDOR CANARY VERIFIED/g).length,8);
 assert.equal(matches(/0\.005 Base USDC \/ call/g).length,1);
 assert.equal(matches(/0\.01 Base USDC \/ call/g).length,7);
});
test("Cannot misrepresent platform-paid tests as 2026-10-25 new retail revenue",()=>{
 assert.match(document,/vendor-financed test purchase/i);
 assert.match(document,/operator-funded verified route calls/i);
 assert.match(document,/not this session's new revenue/i);
 assert.match(document,/not<\/strong> a confirmed retail customer's purchase/i);
 assert.match(document,/has not independently re-read every chain receipt/i);
 assert.match(document,/0 confirmed/i);
 assert.match(document,/PayAPI publicly reports that it paid the eight endpoints/i);
 assert.match(document,/none is counted as an independent repeat buyer/i);
});
test("No unfunded onchain write or secrets hidden inside optional Mezo paid resource",()=>{
 assert.match(document,/Mezo MUSD pinned public ERC-20 state report/);
 assert.match(document,/This newer Mezo endpoint is <em>not<\/em> one of the eight PayAPI-tested SKUs/);
 assert.match(document,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/mezo-musd-sample/);
 assert.match(document,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/mezo-musd-facts/);
 assert.match(document,/Never enter wallet recovery phrases/);
 assert.match(document,/Base USDC/);
});
test("Buyer directory is visible from site nav, paid API CTA, sitemap, README and agent LLMS",()=>{
 assert.match(home,/<a href="verified-x402-apis\/">8 PayAPI-verified x402 APIs<\/a>/);
 assert.match(home,/href="verified-x402-apis\/">Browse 8 live, individually PayAPI-paid-test-verified USDC APIs/);
 assert.equal((robot.match(/\/verified-x402-apis\//g)||[]).length,1);
 assert.match(readme,/verified-x402-apis\/\)/);
 assert.match(llms,/verified-x402-apis\//);
 assert.match(llms,/historical vendor canaries total 0\.075 native Circle Base USDC/);
 assert.match(document,/https:\/\/vm5-openapi-x402\.onrender\.com\/openapi.json/);
});
test("Public source description has one owner and no unsupported guaranteed payout promise",()=>{
 assert.match(document,/one independent South Korea-based creator/);
 assert.match(document,/AI assistance disclosed/);
 assert.match(document,/a larger custom deliverable requires separately agreed acceptance criteria and an actual buyer-funded contract/i);
 for(const bad of ["guaranteed earnings","guaranteed profit","buy now to earn","risk free yield","get rich quick"]){
  assert.equal(document.toLowerCase().includes(bad),false,bad);
 }
});
