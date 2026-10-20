import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const PAGE = new URL("../docs/usdc-invoice-bridge/index.html", import.meta.url);
const CASE_URL = "https://dev.to/livasticvm5primary20260911/why-a-usdc-transfer-is-not-the-same-thing-as-a-paid-invoice-4h08";

test("Original published DEV case study reachable from live free invoice tool",async()=>{
 const html=await readFile(PAGE,"utf8");
 assert.equal(html.split(CASE_URL).length-1,1, "One original article link, not duplicate campaign");
 assert.match(html,/id="invoice-case-study"/);
 assert.match(html,/rel="noopener noreferrer"/);
 assert.match(html,/Four reproducible failure cases/);
});
test("Free tool privacy remains isolated from external article",async()=>{
 const html=await readFile(PAGE,"utf8");
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/src="\.\/app\.mjs"/);
 assert.doesNotMatch(html,/<script[^>]*src="https:/i);
 assert.doesNotMatch(html,/(?:analytics|pixel|gtag|facebook\.com\/tr)/i);
});
test("Education never confuses buyer proposal with actual paywall or sale",async()=>{
 const html=await readFile(PAGE,"utf8");
 assert.match(html,/conditional 49 USDC fixed-price first technical milestone/);
 assert.match(html,/NOT an active x402 automatic checkout/);
 assert.match(html,/no customer testimonial or paid order is implied/);
 assert.match(html,/sample above/);
 assert.match(html,/existing voluntary project inquiry form/);
 assert.ok(html.includes("1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g"));
 assert.match(html,/Sending feedback does not order or purchase anything/);
});
