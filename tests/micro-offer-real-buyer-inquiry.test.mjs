import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../docs/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../docs/styles.css',import.meta.url),'utf8');
const form='https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform';
const start=html.indexOf('<section class="container micro-offers"');
const stop=html.indexOf('</section>',start);
const section=html.slice(start,stop+10);
const offers=[
 ['49','de32513e-4a8c-40ce-ac9a-aa094a5f33d2','OpenAPI Contract Repair'],
 ['39','d0eaa2ce-4b59-4a27-8add-8fd2c5ea8ba2','JSON to CSV Utility'],
 ['25','4a538d2d-acff-4b31-a823-ede6b9305a58','One-Endpoint Smoke Test']
];
test('Exactly three fixed-price historical listings and the original seller card remain present',()=>{
 assert.match(section,/Need a <span>focused fix\?<\/span>/);
 assert.equal((section.match(/class="micro-offer-top"/g)||[]).length,3);
 assert.equal((section.match(/class="micro-offer-actions"/g)||[]).length,3);
 assert.match(section,/dealwork\.ai\/agents\/de422e98-7dd8-42b2-aae4-7c4fea43158f/);
 for(const [price,id] of offers){
  assert.ok(section.includes('$'+price+' <small>USD</small>'));
  assert.ok(section.includes('https://api.dealwork.ai/api/v1/listings/'+id));
 }
});
test('Primary CTA is an actual zero-charge contact form, never a JSON API checkout',()=>{
 assert.equal((section.match(/class="micro-inquire"/g)||[]).length,3);
 assert.equal((section.match(/class="micro-evidence"/g)||[]).length,3);
 const cards=section.split('<article class="micro-offer">').slice(1);
 assert.equal(cards.length,3);
 for(let i=0;i<cards.length;i++){
  const [price,id]=offers[i];
  assert.match(cards[i],new RegExp('class="micro-inquire" href="'+form.replaceAll('/','\\/')+'"'));
  assert.match(cards[i],new RegExp('Request '+price+' USD starting quote'));
  assert.match(cards[i],new RegExp('class="micro-evidence" href="https:\\/\\/api\\.dealwork\\.ai\\/api\\/v1\\/listings\\/'+id));
  assert.match(cards[i],/Public listing JSON \(not a checkout\)/);
  assert.ok(cards[i].indexOf('class="micro-inquire"')<cards[i].indexOf('class="micro-evidence"'));
 }
});
test('No misleading immediate-charge claims, direct wallet pay CTA or invented client testimonial',()=>{
 assert.match(section,/FREE, nonconfidential project inquiry/);
 assert.match(section,/NOT human checkout pages/);
 assert.match(section,/No completed client sale or cash withdrawal/);
 assert.match(section,/legally supported payment\/escrow arrangement/);
 assert.doesNotMatch(section,/Pay now|guaranteed income|100% safe to pay|\$\d+ earned already/i);
});
test('Buyer and provider must agree acceptance, cancellation, AI, legal payout before work',()=>{
 for(const word of ['AI assistance','acceptance tests','cancellation/refund','IP rights','economic owner']){
  assert.ok(section.includes(word));
 }
});
test('Mobile card and inquiry UI remain accessible and no tracking/clipboard scripts introduced',()=>{
 assert.match(css,/\.micro-offer-actions\{display:flex;flex-direction:column/);
 assert.match(css,/\.micro-offer-actions \.micro-inquire:hover,\.micro-offer-actions \.micro-inquire:focus-visible/);
 assert.match(css,/@media\(max-width:920px\).*\.micro-offer-grid\{grid-template-columns:1fr/s);
 assert.doesNotMatch(section,/<script|onclick=|<iframe/i);
 assert.equal((section.match(/aria-label="Request written/g)||[]).length,3);
});
test('Existing one-owner genuine SignScope 15-USDC and x402 0.005 merchant paths preserved',()=>{
 assert.ok(html.includes('clawlancer.ai/marketplace/26905668-717a-41d7-9cc1-5d7ea1c331b1'));
 assert.ok(html.includes('vm5-openapi-x402.onrender.com/v1/csv-sample'));
 assert.ok(html.includes('usdc-invoice-bridge/'));
 assert.ok(html.includes('zero verified purchases'));
});
