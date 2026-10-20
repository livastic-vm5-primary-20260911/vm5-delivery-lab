import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const home=readFileSync('docs/index.html','utf8');
const sitemap=readFileSync('docs/sitemap.xml','utf8');
test('new original VM5 Google URL-prefix owner meta is present with existing owner preserved',()=>{
 const tags=[...home.matchAll(/<meta name="google-site-verification" content="([^"]+)" \/>/g)];
 assert.ok(tags.length>=2);
 assert.ok(tags.some(x=>x[1]==='316OASi4TxhCzfYVamvMy0KRMh-E3YtSvdMOKggn2B0'));
 assert.ok(tags.some(x=>x[1]==='tQM6aCd63rbSZfV3TrpyTFyNbyP-LG-sQ_zLl_6OexI'));
 assert.equal(tags.filter(x=>x[1]==='tQM6aCd63rbSZfV3TrpyTFyNbyP-LG-sQ_zLl_6OexI').length,1);
 assert.ok(home.indexOf('google-site-verification')<home.indexOf('<body'));
});
test('public original site is scoped under correct GitHub Pages project without payment mutation',()=>{
 const canonical='https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/';
 assert.ok(home.includes('<link rel="canonical" href="'+canonical+'">'));
 assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'));
 assert.ok(sitemap.includes('/vm5-delivery-lab/fiat-stablecoin-audit/'));
 assert.ok(!home.includes('sendTransaction('));
});
