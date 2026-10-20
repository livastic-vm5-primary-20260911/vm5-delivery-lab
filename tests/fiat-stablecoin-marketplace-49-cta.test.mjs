import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("docs/fiat-stablecoin-audit/index.html","utf8");
const readme=readFileSync("README.md","utf8");
const id="b0b13a43-a307-478c-b62e-22d880cccec6";
const url="https://clawlancer.ai/marketplace/"+id;

test("free demo links exactly one same-owner fixed 49-USDC seller offer",()=>{
 assert.equal(page.split(url).length-1,1);
 assert.ok(readme.includes(url));
 assert.match(page,/49 USDC FIXED marketplace offer/);
 assert.match(page,/ZERO actual purchases to date/);
 assert.match(page,/not a buyer contract or USDC received/);
});
test("paid fixed offer is distinct from Base-only invoice mini and not custodial",()=>{
 assert.match(readme,/distinct from existing VM5 19USDC/);
 assert.match(page,/No private real contractor data/);
 assert.match(page,/marketplace order\/funding flow has not been independently end-to-end verified/);
 assert.match(page,/Discuss scope before a purchase/);
});
test("client-only no uploads or wallet interactions continue with marketplace link",()=>{
 assert.match(page,/connect-src 'none'/);
 assert.match(page,/form-action 'none'/);
 assert.match(page,/id="funding-file"/);
 assert.match(page,/id="invoices-file"/);
 assert.match(page,/id="payouts-file"/);
 assert.doesNotMatch(page,/window\.ethereum|ethereum\.request|walletconnect/i);
});
