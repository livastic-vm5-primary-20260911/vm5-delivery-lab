import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('docs/fiat-stablecoin-audit/index.html','utf8');
const readme=readFileSync('README.md','utf8');
const art='https://dev.to/livasticvm5primary20260911/one-bank-debit-is-not-40-usdc-payouts-a-local-csv-reconciliation-preflight-2k2';
test('Original publicly verified factual Dev education link exactly once on free landing',()=>{
 assert.equal(html.split(art).length-1,1);
 assert.ok(readme.includes(art));
 assert.match(html,/entirely fictional EUR-to-USDC/);
 assert.match(html,/not real paid invoices/);
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);
});
test('No replacement of paid purchase, original free CLI or local-only privacy boundaries',()=>{
 assert.match(html,/href="\.\/cli.html"/);
 assert.match(html,/49 USDC FIXED marketplace offer/);
 assert.match(html,/Discuss scope before a purchase/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/zero network requests/i);
 assert.match(html,/ZERO actual purchases to date/);
});
