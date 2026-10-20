import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../docs/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../docs/styles.css",import.meta.url),"utf8");
const section=html.match(/<section class="container web3-paid-review"[^>]*>[\s\S]*?<\/section>/)?.[0];
test("Actually published 15-USDC Clawlancer direct listing is linked once",()=>{
 assert.ok(section);
 assert.equal((html.match(/marketplace\/26905668-717a-41d7-9cc1-5d7ea1c331b1/g)||[]).length,1);
 assert.ok(section.includes('15 Base USDC fixed proposal'));
 assert.ok(section.includes('15 <small>USDC</small>'));
 assert.ok(section.includes('rel="noopener noreferrer"'));
});
test("One economic owner disclosed and no made-up independent purchases",()=>{
 assert.match(section,/same one human economic owner/);
 assert.match(section,/zero verified purchases/);
 assert.match(section,/Actual buyer purchases/);
 assert.match(section,/0 verified/);
 assert.doesNotMatch(section,/\bguaranteed buyer\b|verified paid client|security certified/i);
});
test("Free complementary noncustodial SignScope original included",()=>{
 assert.match(section,/https:\/\/livastic-vm2-primary-20260911\.github\.io\/signscope-offline-permit-checker\//);
 assert.match(section,/Try the FREE local pre-sign checker/);
 assert.match(section,/No wallet seed|private signature/);
 assert.match(section,/not an unlimited Solidity audit/i);
});
test("Existing x402 merchant and other Dealwork products preserved",()=>{
 assert.ok(html.includes('https://vm5-openapi-x402.onrender.com/v1/csv-sample'));
 assert.ok(html.includes('usdc-invoice-bridge/'));
 assert.ok(html.includes('dealwork.ai/agents/de422e98-7dd8-42b2-aae4-7c4fea43158f'));
 for(const id of ['de32513e-4a8c-40ce-ac9a-aa094a5f33d2','d0eaa2ce-4b59-4a27-8add-8fd2c5ea8ba2','4a538d2d-acff-4b31-a823-ede6b9305a58']) assert.ok(html.includes(id));
});
test("Dealwork API JSON not misrepresented as a browser checkout",()=>{
 assert.match(html,/Dealwork JSON listing links are informational records, NOT human checkout pages/);
 assert.match(html,/legally supported payment\/escrow arrangement/);
});
test("Responsive styles for paid pilot card are present",()=>{
 assert.match(css,/\.web3-paid-review-inner\{display:grid/);
 assert.match(css,/@media\(max-width:760px\)\{\.web3-paid-review-inner\{grid-template-columns:1fr/);
 assert.equal((html.match(/id="web3-fixed-15usdc"/g)||[]).length,1);
});
