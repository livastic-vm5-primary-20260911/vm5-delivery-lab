import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const checkout="https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/email-dns.html";
test("original VM5 parent product provides exactly one correct honest BUYER-owned 0.005-USDC checkout link",async()=>{
 const h=await readFile("docs/email-dns-preflight/index.html","utf8");
 assert.equal(h.split('href="'+checkout+'"').length-1,1);
 assert(h.includes("Open buyer-initiated 0.005-USDC checkout"));
 assert(h.includes("Inspect unsigned 402 API quote"));
 assert(h.includes("human end-to-end")||h.includes("independently paid live human sale"));
 assert(h.includes("BUYER wallet")||h.includes("buyer-controlled"));
 assert(h.includes("not</strong> a working human checkout"));
 assert(h.includes("NO")||h.includes("not an independently paid"));
});
test("homepage links to real new separate static checkout WITHOUT inflating simulated paid buyer into income",async()=>{
 const [home,readme]=await Promise.all([readFile("docs/index.html","utf8"),readFile("README.md","utf8")]);
 assert(home.includes(checkout));
 assert(readme.includes(checkout));
 assert(home.includes("paid mainnet human end-to-end remains UNVERIFIED"));
 assert(home.includes("Buyers: zero independently verified"));
 assert(readme.includes("NO actual outside mainnet paid human settlement"));
 assert(readme.includes("0.005"));
 assert(home.includes("email-dns-preflight/"));
});
