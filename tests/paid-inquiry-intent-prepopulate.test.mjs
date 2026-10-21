import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const htmlDecode=s=>s.replaceAll('&amp;','&');
const root=new URL('../docs/',import.meta.url);
const pages=[
 {filename:'csv-quality/index.html',free:'free_csv_feedback',paid:'paid_csv_scope',context:'CSV'},
 {filename:'usdc-eur-offramp/index.html',free:'free_usdc_eur_feedback',paid:'paid_usdc_eur_scope',context:'USDC'}
];
const original='https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform';
function anchors(content){
 const matches=[...content.matchAll(/<a\s+[^>]*data-buyer-purpose="([^"]+)"[^>]*>/g)];
 return Object.fromEntries(matches.map(x=>{
  const m=x[0].match(/href="([^"]+)"/);
  assert.ok(m);
  return [x[1],new URL(htmlDecode(m[1]))];
 }));
}
for(const p of pages){
 const page=readFileSync(new URL(p.filename,root),'utf8');
 const links=anchors(page);
 test(p.context+' has exactly two voluntary distinct customer-intent exits',()=>{
  assert.equal(Object.keys(links).length,2);
  assert.deepEqual(Object.keys(links).sort(),[p.free,p.paid].sort());
  for(const link of Object.values(links)){
   assert.equal(link.origin+link.pathname,original);
   assert.equal(link.searchParams.get('usp'),'pp_url');
   assert.ok(link.searchParams.has('entry.1765055758'));
   assert.ok(link.searchParams.get('entry.1765055758').length>85);
   assert.ok(link.searchParams.get('entry.1765055758').length<650);
  }
 });
 test(p.context+' does not confuse free interest and paid scope',()=>{
  assert.notEqual(links[p.free].searchParams.get('entry.1765055758'),links[p.paid].searchParams.get('entry.1765055758'));
  assert.match(links[p.free].searchParams.get('entry.1765055758'),/FREE/);
  assert.match(links[p.paid].searchParams.get('entry.1765055758'),/49 USDC/);
  assert.match(links[p.paid].searchParams.get('entry.1765055758'),/I have not purchased|subject to written agreement/);
 });
 test(p.context+' keeps nonsecret and buyer-chosen terms',()=>{
  assert.match(page,/fictional|invented/i);
  assert.match(page,/No purchase|not checkout|not a checkout|No payment/i);
  assert.match(page,/49.*USDC/);
  assert.ok(!page.includes('window.ethereum'));
  assert.ok(!page.includes('PAYMENT-SIGNATURE'));
 });
}
test('the paid API input remains the original observed POST route without changed custody',()=>{
 const s=readFileSync(new URL('csv-quality/index.html',root),'utf8');
 assert.ok(s.includes('/v1/csv-preflight'));
 assert.ok(s.includes('eip155:8453'));
 assert.ok(s.includes('5,000 atomic token units'));
 assert.ok(s.includes('data-buyer-purpose="paid_csv_scope"'));
});
test('existing original four-way local USDC-EUR sample remains intact',()=>{
 const s=readFileSync(new URL('usdc-eur-offramp/index.html',root),'utf8');
 for(const field of ['id="invoices"','id="transfers"','id="conversions"','id="bank"'])assert.ok(s.includes(field));
 assert.ok(s.includes('connect-src &#39;none&#39;')||s.includes("connect-src 'none'"));
 assert.ok(s.includes('data-buyer-purpose="paid_usdc_eur_scope"'));
});
