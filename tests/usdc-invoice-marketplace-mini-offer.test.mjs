import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const LISTING_URL = "https://clawlancer.ai/marketplace/a06039e5-cab4-4f8c-ae16-03a2c713abd9";
const htmlPath=new URL("../docs/usdc-invoice-bridge/index.html",import.meta.url);
const read=()=>readFile(htmlPath,"utf8");

test("actual separately validated existing original FIXED 19-USDC micro-SKU is linked exactly once, no invented checkout",async()=>{
 const html=await read();
 assert.equal(html.split(LISTING_URL).length-1,1);
 assert.match(html,/id="mini-fixed-listing"/);
 assert.match(html,/smaller, different 19 USDC/);
 assert.match(html,/20 entirely synthetic rows/);
 assert.match(html,/separate from the broader conditional 49 USDC/);
 assert.match(html,/Purchases verified so far: zero/);
 assert.match(html,/unauthenticated detail page currently calls this a generic/);
 assert.match(html,/does not display a checkout button/);
 assert.match(html,/do not send USDC directly from this page/);
});
test("no real user privacy or fake settlement claims in marketplace funnel",async()=>{
 const html=await read();
 assert.match(html,/acceptance and cancellation\/refund conditions on-platform/);
 assert.match(html,/before<\/em> any purchase/);
 assert.match(html,/does not independently verify onchain settlement/);
 assert.match(html,/Listing status does not prove that anyone has purchased/);
 assert.match(html,/rel="noopener noreferrer"/);
});
test("local-only offline matcher remains 100% free without any merchant wallet dependency",async()=>{
 const html=await read();
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/No funds are required to use this free page/);
 assert.match(html,/Compare locally/);
 assert.match(html,/examples\/pilot-50-synthetic-invoices\.csv/);
 assert.match(html,/examples\/pilot-50-synthetic-reported-transfers\.csv/);
 assert.doesNotMatch(html,/<script[^>]+src="https:/i);
 assert.doesNotMatch(html,/<iframe/i);
});
