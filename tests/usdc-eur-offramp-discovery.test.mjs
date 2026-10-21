import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function src(path){return readFileSync(new URL('../docs/'+path,import.meta.url),'utf8');}
test('main homepage links to the distinct inverse off-ramp checker',()=>{
 assert.ok(src('index.html').includes('href="usdc-eur-offramp/"'));
 assert.ok(src('fiat-stablecoin-audit/index.html').includes('href="../usdc-eur-offramp/"'));
});
test('SEO and agent readable directories each contain one unique product link',()=>{
 const url='https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-eur-offramp/';
 assert.equal(src('sitemap.xml').split(url).length,2);
 assert.equal(src('llms.txt').split(url).length,2);
});
test('readme describes evidence and financial boundaries',()=>{
 const s=src('usdc-eur-offramp/README.md');
 for(const term of ['ONE','BigInt','synthetic','bank balance','49 native Base Circle USDC','ZERO customers'])assert.ok(s.includes(term));
});
