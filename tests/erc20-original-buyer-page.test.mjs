import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const page=fs.readFileSync(path.join(root,"docs/erc20-calldata/index.html"),"utf8");
const home=fs.readFileSync(path.join(root,"docs/index.html"),"utf8");
const sitemap=fs.readFileSync(path.join(root,"docs/sitemap.xml"),"utf8");
const llms=fs.readFileSync(path.join(root,"docs/llms.txt"),"utf8");
const url="https://vm5-openapi-x402.onrender.com/v1/erc20-calldata-preflight";
const free="https://vm5-openapi-x402.onrender.com/v1/erc20-calldata-sample";
const owned="0x4e3106520E40af30870caFE78da1B1e7110eD98E";

test("Original landing page advertises ONLY the real tested VM1 payable route and free sample",()=>{
  assert.ok(page.includes(url));
  assert.ok(page.includes(free));
  assert.ok(page.includes("0.010000 USDC"));
  assert.ok(page.includes("10000 atomic"));
  assert.ok(page.includes("eip155:8453"));
  assert.ok(page.includes(owned));
  assert.ok(!page.includes("0x6b01efA0705E91a7aca54271510bf9e594717f34"),
    "Do not confuse VM1 owner recipient with a separate VM5 legacy seller");
  assert.ok(page.includes("No independently verified") || page.includes("no purchase is claimed"));
  assert.ok(page.includes("was pending"));
  assert.ok(!page.includes("guaranteed returns") && !page.includes("audited safe"));
});
test("Safe explanatory page asks for no wallet, sensitive customer data or secrets",()=>{
  assert.ok(page.includes("No JSON-RPC") || page.includes("No JSON-RPC"));
  assert.ok(page.includes("Never send secrets"));
  assert.ok(page.includes("Unsupported selector"));
  assert.ok(page.includes("no chain") || page.includes("no chain") || page.includes("No chain"));
  assert.ok(page.includes("No charge for an initial sanitized inquiry"));
  assert.ok(!page.includes('<input type="password"'));
  assert.ok(!page.includes("window.ethereum.request"));
  assert.ok(!page.includes("eth_sendTransaction"));
  assert.ok(!page.includes("fetch("), "Static page must not send any viewer contents to the operator");
  assert.match(page,/application\/ld\+json/);
  const jsonld=page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonld);
  const data=JSON.parse(jsonld[1]);
  assert.equal(data.offers.price,"0.01");
  assert.equal(data.url,url);
});
test("One discoverable canonical indexed page, not duplicate seller/account",()=>{
  const canonical="https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/erc20-calldata/";
  assert.ok(page.includes(canonical));
  assert.ok(home.includes('href="erc20-calldata/"'));
  assert.ok(llms.includes(canonical));
  assert.equal(sitemap.split(canonical).length-1,1);
  const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,"No duplicate section IDs");
  assert.ok(page.includes('href="../privacy.html"'));
});

test("New original distinct paid ERC-20 event-log SKU is linked with explicit separate free sample and no sales claims",()=>{
 assert.ok(page.includes("ERC-20 Transfer / Approval event-log decoder"));
 assert.ok(page.includes("https://vm5-openapi-x402.onrender.com/v1/erc20-event-sample"));
 assert.ok(page.includes("https://vm5-openapi-x402.onrender.com/v1/erc20-event-preflight"));
 assert.ok(page.includes("https://402index.io/api/v1/services/cd9425ff-a546-428f-a082-55c77a7f8a0d"));
 assert.ok(page.includes("topic0")&&page.includes("topic1")&&page.includes("topic2"));
 assert.ok(page.includes("zero independent purchases of this new event product"));
 assert.ok(page.includes("same original VM1 public receive-only address"));
 assert.ok(llms.includes("ERC-20 separate EVENT-LOG API:"));
 assert.ok(!page.includes("window.ethereum.request"));
});
