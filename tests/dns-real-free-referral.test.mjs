import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const full="https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/email-dns.html";
test("parent technical guide offers REAL actual no-charge DNS preview ahead of paid API, preserving invented example",async()=>{
 const s=await readFile("docs/email-dns-preflight/index.html","utf8");
 assert(s.includes('href="'+full+'"'));
 assert(s.includes('Run FREE REAL public MX/SPF/DMARC preview'));
 assert(s.includes('View free invented JSON sample'));
 assert(s.includes("Google Public DNS"));
 assert(s.includes("before deciding whether a structured API report adds value"));
 assert(s.includes("Google Group posting rights"));
 assert(s.includes("0.005 native Circle Base USDC"));
 assert(s.includes("not</strong> a working human checkout"));
});
test("parent homepage cleanly labels independent Google DoH public domain disclosure and same merchant source",async()=>{
 const [home,readme]=await Promise.all([readFile("docs/index.html","utf8"),readFile("README.md","utf8")]);
 assert(home.includes('href="'+full+'"'));
 assert(home.includes("FREE REAL MX/SPF/DMARC domain preview"));
 assert(home.includes("three explicit browser requests to Google Public DNS"));
 assert(home.includes("0.005 native Circle Base USDC per paid call"));
 assert(home.includes("no promise of actual deliverability"));
 assert(home.includes("paid mainnet human end-to-end remains UNVERIFIED"));
 assert(readme.includes("Google Public DNS-over-HTTPS"));
 assert(readme.includes("NO owner API cost"));
});
