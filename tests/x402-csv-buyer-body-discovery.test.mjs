import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const base=new URL('../docs/csv-quality/',import.meta.url);
const body=JSON.parse(readFileSync(new URL('example-body.json',base),'utf8'));
const listing=JSON.parse(readFileSync(new URL('discovery.json',base),'utf8'));
const page=readFileSync(new URL('index.html',base),'utf8');
const llms=readFileSync(new URL('../docs/llms.txt',import.meta.url),'utf8');
const scheme=listing.resource;
const payment=listing.observedUnsignedQuote;
test('original machine-readable discovery body equals exactly the raw POST fixture',()=>assert.deepEqual(scheme.requestBodyExample,body));
test('fixture is fictional and matches OpenAPI POST required keys and bounded CSV',()=>{
 assert.deepEqual(Object.keys(body).sort(),['csvText','expectedColumns']);
 assert.ok(body.csvText.startsWith('email,amount,date,note\n'));
 assert.deepEqual(body.expectedColumns,['email','amount','date','note']);
 assert.ok(Buffer.byteLength(body.csvText,'utf8')<=32768);
 assert.ok(body.csvText.includes('example.com')&&!body.csvText.includes('PAYMENT-SIGNATURE'));
 assert.ok(body.csvText.includes('not-a-number'));
});
test('POST fixture cannot accidentally be described as GET synthetic paid report',()=>{
 assert.equal(scheme.method,'POST');assert.ok(scheme.url.endsWith('/v1/csv-preflight'));
 assert.equal(scheme.contentType,'application/json');
 assert.ok(scheme.requestBodyExampleUrl.endsWith('/csv-quality/example-body.json'));
 assert.equal(scheme.openapiOperationPointer,'#/paths/~1v1~1csv-preflight/post');
 assert.ok(!scheme.url.endsWith('/csv-report'));
 assert.ok(scheme.openapiSpecUrl.endsWith('/openapi.json'));
});
test('actual observed unsigned quote matches the established original seller account, not a new wallet',()=>{
 assert.equal(payment.httpStatus,402);assert.equal(payment.header,'PAYMENT-REQUIRED');
 assert.equal(payment.x402Version,2);assert.equal(payment.network,'eip155:8453');
 assert.equal(payment.asset.toLowerCase(),'0x833589fcd6edb6e08f4c7c32d4f71b54bda02913');
 assert.equal(payment.payTo,'0x6b01efA0705E91a7aca54271510bf9e594717f34');
 assert.equal(payment.amountAtomic,'5000');assert.equal(payment.quoteIsPayment,false);
});
test('model explicitly separates invalid input 400 from valid unsigned 402 and from actual settlement',()=>{
 const val=listing.behavior;
 assert.ok(val.validBodyNoPaymentHeader.includes('402'));
 assert.ok(val.emptyJsonNoPaymentHeader.includes('400'));
 assert.ok(val.emptyJsonNoPaymentHeader.includes('not evidence'));
 assert.ok(val.paidTimeout.includes('Do not silently sign'));
 assert.ok(val.fulfilledDelivery.includes('not a response delivered'));
});
test('original paid buyer guide links both exact public JSON paths with no wallet execution',()=>{
 assert.ok(page.includes('href="example-body.json"'));
 assert.ok(page.includes('href="discovery.json"'));
 assert.ok(page.includes('--data-binary @vm5-synthetic-body.json'));
 assert.ok(page.includes('empty JSON {} can return 400'));
 assert.ok(!page.includes('wallet_signForAgent'));
 assert.ok(page.indexOf('id="agent-input-discovery"')<page.indexOf('<h3>Unpaid quote: buyer-owned CSV</h3>'));
});
test('agent directory lists both new original URLs and distinguishes from GET',()=>{
 assert.ok(llms.includes(scheme.requestBodyExampleUrl));
 assert.ok(llms.includes('csv-quality/discovery.json'));
 assert.ok(llms.includes('NOT the already listed synthetic GET'));
});
test('public JSON has no passwords, private keys, signed payment headers or confidential customer values',()=>{
 const raw=JSON.stringify(listing)+JSON.stringify(body);
 for(const term of ['sk_live_', 'PRIVATE KEY', 'BEGIN PRIVATE', 'payment-signature:', 'mnemonic', 'customer@', 'bob@'])assert.ok(!raw.includes(term));
 assert.match(listing.privacy,/No secrets/);
 assert.match(listing.salesEvidence,/No independent new paid POST buyer/);
});
test('discovery and fixture are valid UTF-8 JSON documents rather than executable scripts',()=>{
 for(const n of ['example-body.json','discovery.json']){
  assert.ok(existsSync(new URL(n,base)));
  const text=readFileSync(new URL(n,base),'utf8');assert.ok(text.startsWith('{\n'));JSON.parse(text);
  assert.ok(!text.includes('<script')&&!text.includes('http://'));
 }
});
