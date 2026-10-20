import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = f => readFileSync(new URL("../"+f,import.meta.url),"utf8");
const page=read("docs/x402-template/index.html");
const home=read("docs/index.html");
const sitemap=read("docs/sitemap.xml");
const readme=read("README.md");

test("standalone product page has indexable SEO and no client-side tracking",()=>{
  for(const x of ["<!doctype html>","<html lang=\"en\">","name=\"viewport\"","name=\"description\"","rel=\"canonical\"","<main>","<footer>"])assert.ok(page.includes(x));
  assert.ok(page.length>9000);
  assert.doesNotMatch(page,/<script\b|google-analytics|gtag\(|<form\b/i);
});
test("actual existing 0.01 native Circle Base USDC payment quote stated exactly",()=>{
  assert.match(page,/0\.01 USDC/);
  assert.match(page,/10,000 atomic USDC units/);
  assert.match(page,/eip155:8453/);
  assert.match(page,/x402 v2/);
  assert.match(page,/\/v1\/x402-template/);
  assert.match(page,/PAYMENT-REQUIRED/);
  assert.match(page,/HTTP 402/);
});
test("one third-party NoHumans actual paid-and-delivered scout and unique old tx substantiated, no made-up organic customers",()=>{
  assert.ok(page.includes("0x5ced9d7d47a864b62afd408d785e0cf7a6b0cc862a6940630ee9283ce18be912"));
  assert.match(page,/https:\/\/nohumans\.directory\/l\/7fb76f81-0b5/);
  assert.match(page,/same automated scout/);
  assert.match(page,/one outside automated buyer/);
  assert.match(page,/No new independent paid purchase has been verified from Market402/);
  assert.match(page,/exact purchased API and successful HTTP response have not been independently matched/);
  assert.doesNotMatch(page,/guaranteed paid organic customers|100% guaranteed income/i);
});
test("public raw source and free sample links distinguish hosted convenience from private IP",()=>{
  assert.match(page,/x402-payment-template\.yaml/);
  assert.match(page,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/docs/);
  assert.match(page,/https:\/\/vm5-openapi-x402\.onrender\.com\/v1\/sample/);
  assert.match(page,/not production payment verification middleware/);
  assert.match(page,/publicly inspectable/);
  assert.match(page,/no private key or MetaMask seed/);
});
test("original existing Market402 integration citation discloses one observation and no buyer",()=>{
  assert.match(page,/https:\/\/market402\.com\/op\/vm5-openapi-x402\.onrender\.com/);
  assert.match(page,/one recorded observation/);
  assert.match(page,/score of 100/);
  assert.match(page,/not a grade of financial safety/);
  assert.match(page,/not a grade of financial safety, merchant identity, a verified merchant badge, or real revenue/);
  assert.doesNotMatch(page,/Market402 paid customer|verified human customers|guaranteed ROI/i);
});
test("home, README and canonical sitemap expose exactly one dedicated existing paid template buyer page",()=>{
  const url="https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/x402-template/";
  assert.equal(sitemap.split(url).length-1,1);
  assert.ok(page.includes(url));
  assert.ok(home.includes('href="x402-template/"'));
  assert.ok(readme.includes(url));
  assert.ok(home.includes('href="csv-quality/"'));
  assert.ok(home.includes('href="workflow-risk/"'));
});
