import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessPaymentChallenge,checkOne,sample,TARGETS,ASSET,PAY_TO} from '../tools/public-x402-checkout-canary.mjs';

const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64');
const quote=(values={})=>encode({x402Version:2,accepts:[{scheme:'exact',network:'eip155:8453',asset:ASSET,payTo:PAY_TO,amount:'5000',...values}]});
const response=(status,head='',payload={ok:true,network:'eip155:8453'})=>async()=>
 new Response(JSON.stringify(payload),{status,headers:head?{'payment-required':head}:{}});

test('canonical Base Circle USDC quote passes and any mismatched term fails',()=>{
 assert.equal(assessPaymentChallenge(quote(),'5000').ok,true);
 for(const bad of [{network:'eip155:137'},{asset:'0x'+'1'.repeat(40)},
   {payTo:'0x'+'2'.repeat(40)},{amount:'5001'},{scheme:'other'}]){
  assert.equal(assessPaymentChallenge(quote(bad),'5000').ok,false);
 }
 assert.equal(assessPaymentChallenge('invalid!','5000').ok,false);
 assert.equal(assessPaymentChallenge(encode({x402Version:1,accepts:[]}),'5000').ok,false);
});
test('CSV valid synthetic POST quote, HTTP 400 and absent quote are separated',async()=>{
 const t=TARGETS.find(x=>x.id==='csv');
 assert.equal((await checkOne(response(402,quote()),t)).status,'pass');
 assert.equal((await checkOne(response(400,quote()),t)).status,'degraded');
 assert.equal((await checkOne(response(402),t)).status,'degraded');
});
test('health status, network errors and no revenue claims',async()=>{
 const t=TARGETS.find(x=>x.id==='health');
 assert.equal((await checkOne(response(200),t)).status,'pass');
 assert.equal((await checkOne(response(200,'',{ok:false}),t)).status,'degraded');
 assert.equal((await checkOne(async()=>{throw new Error('offline');},t)).status,'unknown');
 const fakeFetch=async url=>{
  if(url.includes('/health'))return new Response(JSON.stringify({ok:true,network:'eip155:8453'}),{status:200});
  if(url.includes('/v1/'))return new Response('{}',{status:402,headers:{'payment-required':quote({amount:url.includes('/x402-template')?'10000':'5000'})}});
  return new Response('<html></html>',{status:200});
 };
 const a=await sample(fakeFetch,new Date('2026-10-21T00:00:00Z'));
 assert.equal(a.summary.total,5);
 assert.equal(a.summary.pass,5);
 assert.equal(a.noPayment,true);
 assert.equal(a.paidDeliveryVerified,false);
 assert.equal(a.noBuyerCountClaim,true);
});
test('browser page is mobile, honest and only loads same-origin snapshot',()=>{
 const html=fs.readFileSync('docs/merchant-status/index.html','utf8');
 const script=fs.readFileSync('docs/merchant-status/app.mjs','utf8');
 assert.match(html,/name="viewport"/);
 assert.match(html,/connect-src 'self'/);
 assert.match(html,/NOT CONTINUOUS UPTIME/i);
 assert.match(html,/proof of revenue/i);
 assert.match(script,/\.\/latest\.json/);
 assert.doesNotMatch(script,/\b(eval|innerHTML|localStorage|sessionStorage|sendBeacon|XMLHttpRequest)\b/);
});
