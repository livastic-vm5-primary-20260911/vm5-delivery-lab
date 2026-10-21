import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const docs = resolve(import.meta.dirname,'../docs');
const text = readFileSync(join(docs,'llms.txt'),'utf8');
const origin = 'https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/';

test('conforms to llms.txt core structure with absolute HTTPS destinations',()=>{
  assert.match(text,/^# VM5 Delivery Lab\n\n> /);
  assert.match(text,/^## Live machine-readable API and x402 examples$/m);
  assert.match(text,/^## Free local crypto operational QA/m);
  const matches = [...text.matchAll(/^- \[([^\]]+)\]\((https:\/\/[^\s)]+)\)(?:: .*|$)/gm)];
  assert.ok(matches.length>=12);
  for(const [,name,url] of matches){
    assert.ok(name.length>8);
    assert.ok(url.startsWith('https://'));
    if(url.startsWith(origin)){
      const local = decodeURIComponent(new URL(url).pathname.slice('/vm5-delivery-lab/'.length));
      const file = local.endsWith('/') ? join(docs,local,'index.html') : join(docs,local);
      assert.ok(existsSync(file),'missing internal catalog destination '+url);
    }
  }
});
test('read-only free sample, a paid quote, and nonzero buyer warnings are distinguished',()=>{
  assert.match(text,/GET the free synthetic sample/);
  assert.match(text,/unsigned HTTP 402 quote/);
  assert.match(text,/0\.005 native Circle USDC on Base/);
  assert.match(text,/x402-compatible wallet decides whether to sign/);
  assert.match(text,/not a completed purchase/);
  assert.match(text,/Never send seeds, private keys/);
  assert.match(text,/No private keys, wallet connection/);
});
test('catalog points to existing original paid offers, without invented previous orders',()=>{
  assert.match(text,/a06039e5-cab4-4f8c-ae16-03a2c713abd9/);
  assert.match(text,/b0b13a43-a307-478c-b62e-22d880cccec6/);
  assert.match(text,/unpurchased conditional offer/);
  assert.doesNotMatch(text,/guaranteed profit|guaranteed pay|already ordered by humans/i);
});
for(const [page,path] of [
  ['home','index.html'],
  ['csv buyer','csv-quality/index.html'],
  ['invoice checker','usdc-invoice-bridge/index.html']
]) {
 test(page+' exposes its llms.txt alternate pointer',()=>{
  const html=readFileSync(join(docs,path),'utf8');
  const relative=path==='index.html'?'llms.txt':'../llms.txt';
  assert.ok(html.includes('rel="describedby" href="'+relative+'" type="text/plain"'));
  assert.ok(existsSync(resolve(join(docs,path),'..',relative)));
 });
}
