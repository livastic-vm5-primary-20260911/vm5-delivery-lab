#!/usr/bin/env node
/**
 * Read-only, one-shot public readiness probe of the VM5-owned x402 merchant.
 * No payments, wallet signatures, customer data, arbitrary URLs or approval.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const HOST='https://vm5-openapi-x402.onrender.com';
export const PAY_TO='0x6b01efA0705E91a7aca54271510bf9e594717f34';
export const ASSET='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const HASH='0x5ced9d7d47a864b62afd408d785e0cf7a6b0cc862a6940630ee9283ce18be912';
const SITE='https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/';

export const TARGETS=Object.freeze([
 Object.freeze({id:'health',title:'Service health',method:'GET',url:HOST+'/health',expected:200}),
 Object.freeze({id:'csv',title:'Buyer-input CSV preflight (synthetic sample)',method:'POST',url:HOST+'/v1/csv-preflight',
    body:{csvText:'invoice,amount\nINV-SYNTHETIC-001,12.00\n'},expected:402,price:'5000'}),
 Object.freeze({id:'template',title:'x402 developer OpenAPI template',method:'GET',url:HOST+'/v1/x402-template',expected:402,price:'10000'}),
 Object.freeze({id:'receipt',title:'Public historical Base USDC receipt preflight',method:'GET',
    url:HOST+'/v1/base-usdc-receipt?tx='+HASH+'&recipient='+PAY_TO+'&minUsdc=0.010000',
    expected:402,price:'5000'}),
 Object.freeze({id:'checkout',title:'Public free-first CSV checkout page',method:'GET',url:SITE,expected:200})
]);

export function assessPaymentChallenge(header,expectedPrice){
 if(typeof header!=='string'||header.length<10||header.length>60000)
   return {ok:false,reason:'PAYMENT-REQUIRED header missing or invalid length'};
 let parsed;
 try {
   if(!/^[A-Za-z0-9+/=_-]+$/.test(header))throw new Error('bad base64');
   const raw=Buffer.from(header.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8');
   if(raw.length>20000)throw new Error('oversized');
   parsed=JSON.parse(raw);
 }catch{return {ok:false,reason:'Could not decode x402 quote'};}
 if(parsed?.x402Version!==2||!Array.isArray(parsed.accepts))
   return {ok:false,reason:'No canonical x402 v2 accepts array'};
 const a=parsed.accepts.find(v=>v?.scheme==='exact'&&v?.network==='eip155:8453'&&
   v?.asset?.toLowerCase()===ASSET.toLowerCase()&&
   v?.payTo?.toLowerCase()===PAY_TO.toLowerCase()&&
   String(v?.amount)===String(expectedPrice));
 if(!a)return {ok:false,reason:'Network, official USDC token, recipient or fixed price mismatch'};
 return {ok:true,network:a.network,asset:a.asset,amountMicroUSDC:String(a.amount),recipient:a.payTo,x402Version:2};
}

async function boundedFetch(fetcher,url,options){
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),12000);
 try{return await fetcher(url,{...options,signal:abort.signal,redirect:'error'});}
 finally{clearTimeout(timer);}
}

export async function checkOne(fetcher,t){
 const event={id:t.id,title:t.title,method:t.method,route:new URL(t.url).pathname,
   category:'read_only',expectedHttp:t.expected,actualHttp:null,status:'unknown'};
 try{
   const headers={'Accept':'application/json'};
   if(t.body)headers['Content-Type']='application/json';
   const response=await boundedFetch(fetcher,t.url,
      {method:t.method,headers,body:t.body?JSON.stringify(t.body):undefined});
   event.actualHttp=response.status;
   if(response.status!==t.expected){
     event.status='degraded';
     event.explanation='Expected HTTP '+t.expected+' but observed HTTP '+response.status+'. No payment was sent.';
     return event;
   }
   if(t.expected===200){
     if(t.id==='health'){
       let body;
       try{body=await response.json();}catch{body=null;}
       if(body?.ok!==true||body?.network!=='eip155:8453'){
         event.status='degraded';event.explanation='Wrong health response or network';return event;
       }
     }
     event.status='pass';
     event.explanation='Public HTTP 200; this does not verify a paid API response.';
     return event;
   }
   const parsed=assessPaymentChallenge(response.headers.get('payment-required'),t.price);
   if(!parsed.ok){
     event.status='degraded';event.explanation=parsed.reason;return event;
   }
   event.status='pass';
   event.quote={x402Version:2,network:parsed.network,asset:parsed.asset,recipient:parsed.recipient,
     amountMicroUSDC:parsed.amountMicroUSDC,priceUSDC:(Number(parsed.amountMicroUSDC)/1e6).toFixed(3)};
   event.explanation='Correct unsigned HTTP 402 quote only; signature, settlement and delivery NOT tested.';
   return event;
 }catch(error){
   event.status='unknown';
   event.explanation='Bounded public network probe failed or timed out. Inconclusive; not proof of downtime.';
   event.errorType=error?.name==='AbortError'?'Timeout':'TransportError';
   return event;
 }
}

export async function sample(fetcher=globalThis.fetch,now=new Date()){
 const checks=[];
 for(const t of TARGETS)checks.push(await checkOne(fetcher,t));
 return {schema:'vm5-original-merchant-public-checkout-canary-v1',checkedAtUTC:now.toISOString(),
   scope:'VM5-owned public URLs only; synthetic CSV; no wallet or private data',
   noPayment:true,paidDeliveryVerified:false,noBuyerCountClaim:true,
   statement:'Unsigned HTTP 402 preflights do not prove customer payment, signing, settlement or paid handler delivery.',
   target:HOST,network:'eip155:8453',asset:ASSET,recipient:PAY_TO,
   summary:{pass:checks.filter(x=>x.status==='pass').length,
     degraded:checks.filter(x=>x.status==='degraded').length,
     unknown:checks.filter(x=>x.status==='unknown').length,total:checks.length},
   checks};
}
async function main(){
 if(process.argv.slice(2).join(' ')!=='--live')
   throw new Error('Usage: node tools/public-x402-checkout-canary.mjs --live');
 const data=await sample();
 const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../docs/merchant-status/latest.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 const temp=output+'.tmp-'+process.pid;
 try{await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(temp,output);}
 finally{await fs.rm(temp,{force:true});}
 console.log(JSON.stringify({checkedAtUTC:data.checkedAtUTC,summary:data.summary,
   checks:data.checks.map(x=>({id:x.id,http:x.actualHttp,status:x.status}))}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
}
