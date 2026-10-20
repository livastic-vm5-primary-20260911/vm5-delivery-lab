import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
const page=read("docs/workflow-risk/index.html");
const index=read("docs/index.html");
const sitemap=read("docs/sitemap.xml");
const readme=read("README.md");
test("static product page is accessible and SEO canonical, with no trackers or credential entry",()=>{
  for(const k of ['<!doctype html>','<html lang="en">','name="viewport"','name="description"','rel="canonical"','<main>','<footer>']) assert.ok(page.includes(k),k);
  assert.ok(page.length>7500);
  assert.doesNotMatch(page,/<script\b|google-analytics|gtag\(|<form\b/i);
});
test("does not falsely claim the newest product is paid or has organic customers",()=>{
 assert.match(page,/Product-specific outside customers: zero verified/);
 assert.match(page,/same independent automated scout/);
 assert.match(page,/No paid workflow-risk users, subscriptions, net profit or fiat cashout are claimed/);
 assert.match(page,/Local mocked settlement is not a real transfer/);
 assert.doesNotMatch(page,/guaranteed ROI|certified secure|already bought by \d+ customers/i);
});
test("exact real x402 product details and free vs paid routes are declared",()=>{
 assert.match(page,/0\.20 USDC/);
 assert.match(page,/200,000 atomic USDC units/);
 assert.match(page,/eip155:8453/);
 assert.match(page,/x402 v2/);
 assert.match(page,/\/v1\/workflow-risk-sample/);
 assert.match(page,/\/v1\/workflow-risk/);
 assert.match(page,/PAYMENT-REQUIRED/);
 assert.match(page,/before.*payment challenge/);
});
test("developer preview offers representative bounded and privacy-safe workflow input",()=>{
 assert.match(page,/includeSarif/);
 assert.match(page,/workflowYaml/);
 assert.match(page,/actions\/checkout@v4/);
 assert.match(page,/48,000 UTF-8 bytes/);
 assert.match(page,/Do not include private repo credentials or customer data/);
 assert.match(page,/does not intentionally store submitted YAML/);
});
test("original VM2 MIT license/provenance and code unit evidence are disclosed",()=>{
 assert.match(page,/apify-workflow-guard/);
 assert.match(page,/same human economic owner/);
 assert.match(page,/173 local tests/);
 assert.match(page,/986df02/);
 assert.match(page,/not a penetration test/);
});
test("homepage, site map and README expose exactly one original product URL",()=>{
 const url="https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/workflow-risk/";
 assert.equal(sitemap.split(url).length-1,1);
 assert.ok(page.includes(url));
 assert.ok(index.includes('href="workflow-risk/"'));
 assert.ok(readme.includes(url));
});
