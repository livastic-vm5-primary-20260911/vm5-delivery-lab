import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('new public Google project-prefix verification file has exact format',()=>{
 const n='googlecede1404657214bb.html';
 assert.equal(readFileSync('docs/'+n,'utf8'),'google-site-verification: '+n+'\n');
});
test('original old and new GSC HTML tags and canonical path remain intact',()=>{
 const h=readFileSync('docs/index.html','utf8');
 const map=readFileSync('docs/sitemap.xml','utf8');
 const canonical='https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/';
 assert.ok(h.includes('<link rel="canonical" href="'+canonical+'">'));
 assert.ok(h.includes('316OASi4TxhCzfYVamvMy0KRMh-E3YtSvdMOKggn2B0'));
 assert.ok(h.includes('tQM6aCd63rbSZfV3TrpyTFyNbyP-LG-sQ_zLl_6OexI'));
 assert.ok(map.includes('<loc>'+canonical+'</loc>'));
});
