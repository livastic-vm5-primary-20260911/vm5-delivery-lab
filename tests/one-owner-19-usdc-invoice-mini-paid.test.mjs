import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../docs/styles.css',import.meta.url),'utf8');
const section=html.match(/<section class="container invoice-mini-paid"[^>]*>[\s\S]*?<\/section>/)?.[0];
const id='a06039e5-cab4-4f8c-ae16-03a2c713abd9';

test('Original known ACTIVE 19 native Circle Base USDC marketplace product has exactly one accurate homepage link',()=>{
 assert.ok(section);
 assert.equal((html.match(new RegExp(id,'g'))||[]).length,1);
 assert.match(section,/19-USDC marketplace listing/);
 assert.match(section,/19 <small>USDC<\/small>/);
 assert.match(section,/Base Circle USDC invoice/);
 assert.match(section,/20-row, 100% fictional/);
 assert.match(section,/active: true, independently verified purchases: 0/);
});
test('One ultimate real owner, distinct source seller, no fabricated purchase success',()=>{
 assert.match(section,/same one human economic owner/);
 assert.match(section,/our original VM5 seller/i);
 assert.match(section,/0 paid orders/);
 assert.doesNotMatch(section,/guaranteed profit|previous paying customer|we processed your transaction|audit approved|earn.*passive income/i);
});
test('Primary marketplace and secondary FREE sample distinguish cash/personal data, both user opt-in',()=>{
 assert.match(section,new RegExp('href="https://clawlancer\\.ai/marketplace/'+id+'"'));
 assert.match(section,/href="\.\/usdc-invoice-bridge\//);
 assert.match(section,/Try 50 fictional rows FREE in your browser/);
 assert.match(section,/does not require payment, wallet access or file uploads/);
 assert.match(section,/do not upload them to a third-party marketplace/);
 assert.match(section,/rel="noopener noreferrer"/);
});
test('Existing three paid/quote flows and separately VM2-owned 15 USDC remain unmodified',()=>{
 for(const k of [
  '26905668-717a-41d7-9cc1-5d7ea1c331b1',
  'de32513e-4a8c-40ce-ac9a-aa094a5f33d2',
  'd0eaa2ce-4b59-4a27-8add-8fd2c5ea8ba2',
  '4a538d2d-acff-4b31-a823-ede6b9305a58',
  'vm5-openapi-x402.onrender.com/v1/csv-sample',
  'usdc-invoice-bridge/',
 ]) assert.ok(html.includes(k),k);
 assert.equal((html.match(/id="invoice-mini-paid"/g)||[]).length,1);
 assert.equal((html.match(/id="web3-fixed-15usdc"/g)||[]).length,1);
});
test('Visual layout is responsive, CSS and aria names exist and require no JS wallet behaviors',()=>{
 assert.match(css,/\.invoice-mini-paid-inner\{display:grid/);
 assert.match(css,/@media\(max-width:760px\)\{\.invoice-mini-paid-inner\{grid-template-columns:1fr/);
 assert.match(section,/aria-labelledby="invoice-mini-paid-title"/);
 assert.match(section,/aria-label="Original 19-USDC synthetic-only offer terms"/);
 assert.doesNotMatch(section,/<script|onclick=|eth_sendTransaction|connectWallet/i);
});
