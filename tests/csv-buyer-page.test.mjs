import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const page = read("docs/csv-quality/index.html");
const home = read("docs/index.html");
const map = read("docs/sitemap.xml");
const readme = read("README.md");

test("paid CSV conversion page is a substantive standalone HTML page", () => {
  assert.match(page, /<!doctype html>/i);
  assert.match(page, /<html lang="en">/);
  assert.match(page, /name="description"/);
  assert.match(page, /rel="canonical"/);
  assert.match(page, /name="viewport"/);
  assert.match(page, /<main>/);
  assert.match(page, /<footer>/);
  assert.ok(page.length > 7000);
});

test("free preview and both valid paid routes are discoverable with exact prices", () => {
  for (const path of ["/v1/csv-sample","/v1/csv-report","/v1/csv-preflight"]) {
    assert.ok(page.includes(path), path);
  }
  assert.match(page, /0\.005 USDC/);
  assert.match(page, /5,000 atomic token units/);
  assert.match(page, /eip155:8453/);
  assert.match(page, /x402 v2/);
  assert.match(page, /PAYMENT-REQUIRED/);
  assert.match(page, /HTTP 402|Expect: 402/);
  assert.match(page, /32 KiB/);
});

test("real receipts are attributed conservatively, never described as recurring buyers", () => {
  const priorCsvTx = "0xc0c69aa8709b848ab3c0d521ac6540e019738f0804565dfe19652bcb3c290838";
  const newPaymentTx = "0x31c05f6ee783aea8a73733b49c406c69d24cc712503926a840ebb424f0e2ecca";
  assert.ok(page.includes(priorCsvTx));
  assert.ok(page.includes(newPaymentTx));
  assert.match(page, /same outside automated buyer/);
  assert.match(page, /have not been independently linked/);
  assert.match(page, /not a verified repeat order/);
  assert.match(page, /No organic repeat customers or net profit claimed/);
  assert.doesNotMatch(page, /two paying human customers/i);
  assert.doesNotMatch(page, /guaranteed income/i);
});

test("outdated no-settlement language removed from original storefront", () => {
  assert.ok(home.includes('href="csv-quality/"'));
  assert.ok(home.includes("0.005 USDC"));
  assert.ok(home.includes("same independent automated outside scout"));
  assert.ok(readme.includes("CSV structural quality API buyer guide"));
  assert.doesNotMatch(home, /A successful real payment has not yet been tested/);
  assert.doesNotMatch(readme, /No end-to-end USDC settlement or buyer order has been verified/);
});

test("sitemap canonical URL listed exactly once, page has no scripts or user-data tracking", () => {
  const url="https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/csv-quality/";
  assert.equal(map.split(url).length-1,1);
  assert.ok(page.includes(url));
  assert.doesNotMatch(page, /<script\b/i);
  assert.doesNotMatch(page, /google-analytics|analytics\.google|gtag\(/i);
});

test("high-ticket services remain separate conditional offers, not prepaid guaranteed projects",()=>{
  assert.match(page, /separate \$39 scoped JSON-to-CSV CLI offer/);
  assert.match(page, /independent buyer acceptance required/);
  assert.match(page, /No browser credit-card checkout is offered here/);
  assert.match(page, /Never submit passwords, patient data, private customer records/);
});
