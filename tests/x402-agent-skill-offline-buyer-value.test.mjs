import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {inspectUnsignedQuote} from '../skills/x402-quote-preflight/scripts/inspect-payment-required.mjs';

const ROOT='skills/x402-quote-preflight/';
const URL='https://vm5-openapi-x402.onrender.com/v1/csv-report';
const PAYTO='0x6b01efa0705e91a7aca54271510bf9e594717f34';
const ASSET='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function fixture(override={}){
 const ob={x402Version:2,resource:{url:URL,mimeType:'application/json',description:'Synthetic demonstration only'},
   accepts:[{scheme:'exact',network:'eip155:8453',amount:'5000',asset:ASSET,payTo:PAYTO,maxTimeoutSeconds:300,extra:{name:'USD Coin',version:'2'}}]};
 if(override.resource)Object.assign(ob.resource,override.resource);
 if(override.accept)Object.assign(ob.accepts[0],override.accept);
 if(override.top)Object.assign(ob,override.top);
 return Buffer.from(JSON.stringify(ob)).toString('base64');
}
const encode=(o)=>Buffer.from(JSON.stringify(o),'utf8').toString('base64');
const exec=(args=[],input='')=>spawnSync(process.execPath,[ROOT+'scripts/inspect-payment-required.mjs',...args],{cwd:process.cwd(),input,encoding:'utf8',timeout:6000,maxBuffer:150000});

test('skill is a separately named Vercel skills-compatible SKILL.md with nonmagical AI disclosure',async()=>{
 const txt=await readFile(ROOT+'SKILL.md','utf8');
 assert.match(txt,/^---\nname: x402-quote-preflight\n/);
 assert.match(txt,/^description: .{90,}/m);
 assert.match(txt,/AI-assisted/);
 assert.match(txt,/technically distinct from the same-one-owner VM1/);
 assert.match(txt,/NOT a wallet/);
 assert.match(txt,/never sign|NEVER sign/);
 assert(!/run.*curl.*to.*pay automatically/i.test(txt));
});
test('real entirely local demo is explicitly fictitious and never uses original payTo',async()=>{
 const x=exec(['--demo']);
 assert.equal(x.status,0,x.stderr);
 const v=JSON.parse(x.stdout);
 assert.equal(v.fixtureOnly,true);
 assert.equal(v.offers[0].amountUSDC,'0.005000');
 assert.equal(v.offers[0].payTo,'0x1111111111111111111111111111111111111111');
 assert.match(v.resourceUrl,/example.invalid/);
 assert.match(v.kind,/NOT_SETTLEMENT/);
});
test('valid original GET quote verifies all six scoped fields but no payment finality',()=>{
 const o=inspectUnsignedQuote(fixture(),{expectedUrl:URL,expectVm5CsvReport:true});
 assert.equal(o.resourceUrl,URL);
 assert.equal(o.offers[0].amountUSDC,'0.005000');
 assert.equal(o.offers[0].payTo,PAYTO);
 assert.equal(o.offers[0].nativeCircleBaseUSDC,true);
 assert.match(o.caution,/not|Does not/i);
 assert.match(o.kind,/NOT_SETTLEMENT/);
});
test('wrong payee stops and never claims matching seller',()=>{
 assert.throws(()=>inspectUnsignedQuote(fixture({accept:{payTo:'0x1111111111111111111111111111111111111111'}}),{expectVm5CsvReport:true}),/did NOT match/);
});
test('wrong token or network rejects original exactly verified profile',()=>{
 for(const a of [{network:'eip155:1'},{asset:'0x1111111111111111111111111111111111111111'}]){
  assert.throws(()=>inspectUnsignedQuote(fixture({accept:a}),{expectVm5CsvReport:true}),/did NOT match/);
 }
});
test('non-Base token must NOT be incorrectly displayed in USDC',()=>{
 const o=inspectUnsignedQuote(fixture({accept:{asset:'0x1111111111111111111111111111111111111111'}}));
 assert.equal(o.offers[0].nativeCircleBaseUSDC,false);
 assert.equal(o.offers[0].amountUSDC,null);
});
test('incorrect paid amount rejects original selector',()=>{
 for(const v of ['5001','0','50000'])assert.throws(()=>inspectUnsignedQuote(fixture({accept:{amount:v}}),{expectVm5CsvReport:true}),/did NOT match/);
});
test('unsupported v1, malformed quoted amount and scheme rejected',()=>{
 assert.throws(()=>inspectUnsignedQuote(fixture({top:{x402Version:1}})),/x402 v2/);
 for(const amount of ['-1','5.000','1e40','0001','12 USD',2,null])assert.throws(()=>inspectUnsignedQuote(fixture({accept:{amount}})),/Malformed/);
 assert.throws(()=>inspectUnsignedQuote(fixture({accept:{scheme:'upto'}})),/Malformed/);
});
test('strict invalid quote URL and actual expected URL mismatch rejected',()=>{
 for(const u of ['http://example.com/fake','https://user:password@example.com/fake','https://example.com/report#frag']){
  assert.throws(()=>inspectUnsignedQuote(fixture({resource:{url:u}})),/canonical HTTPS/);
 }
 assert.throws(()=>inspectUnsignedQuote(fixture(),{expectedUrl:'https://another.example.com/a'}),/does not match/);
});
test('oversized header, non-base64, invalid UTF-8 and nonsensical input rejected',()=>{
 for(const s of ['','PAYMENT-SIGNATURE: SECRET','not-base64!','A'.repeat(66000),'abcd_',encode({some:'json'}),Buffer.from([255,254,1,3]).toString('base64')]){
  assert.throws(()=>inspectUnsignedQuote(s));
 }
});
test('more than 10 offers and non-array accepts rejected',()=>{
 const d=JSON.parse(Buffer.from(fixture(),'base64').toString('utf8'));
 d.accepts=Array.from({length:11},()=>({...JSON.parse(Buffer.from(fixture(),'base64').toString('utf8')).accepts[0]}));
 assert.throws(()=>inspectUnsignedQuote(encode(d)),/x402 v2/);
 d.accepts={};assert.throws(()=>inspectUnsignedQuote(encode(d)),/x402 v2/);
});
test(' CLI rejects mismatched payee with exit2 and no credit, accepts exact fake TEST input only',()=>{
 const good=exec(['--expect-vm5-csv-report'],fixture()+'\n');
 assert.equal(good.status,0,good.stderr);
 assert.equal(JSON.parse(good.stdout).fixtureOnly,false);
 const wrong=exec(['--expect-vm5-csv-report'],fixture({accept:{payTo:'0x1111111111111111111111111111111111111111'}})+'\n');
 assert.equal(wrong.status,2);
 assert.match(wrong.stderr,/did NOT match/);
 assert(!/SUCCESSFUL_PAYMENT|TRANSACTION_SENT/.test(wrong.stdout));
});
test(' README and buyer page show one original, genuinely source-readable installation command but no claimed buyer',async()=>{
 const [readme,html]=await Promise.all([readFile('README.md','utf8'),readFile('docs/csv-quality/index.html','utf8')]);
 assert(readme.includes(ROOT+'SKILL.md'));
 assert(html.includes('id="x402-agent-skill"'));
 assert(html.includes('npx skills add livastic-vm5-primary-20260911/vm5-delivery-lab --list'));
 assert(html.includes('npx skills add livastic-vm5-primary-20260911/vm5-delivery-lab --skill x402-quote-preflight'));
 assert(html.includes('Publishing the skill is not a verified third-party install'));
 assert(html.includes('DISABLE_TELEMETRY=1'));
 assert(html.includes('paid API'));
});
test(' CLI source is offline, no user credentials, wallet RPC, exec or installed deps',async()=>{
 const s=await readFile(ROOT+'scripts/inspect-payment-required.mjs','utf8');
 assert(s.includes('readFileSync'));
 assert(!/from ['"](?:node:)?https?['"]/.test(s));
 assert(!/fetch\s*\(|XMLHttpRequest|eth_sign|eth_send|wallet_connect|process\.env|spawn\s*\(|exec\s*\(/.test(s));
 assert(!/\/home\/|\/srv\/|\.ssh|document\.cookie|process\.env|API_KEY|wallet\.sign|eth_sendTransaction|process\.argv\s*=\s*/i.test(s));
});
test(' fixture misuse cannot confirm original seller, no actual customer or chain evidence',()=>{
 const x=exec(['--demo','--expect-vm5-csv-report']);
 assert.equal(x.status,2);
 assert.match(x.stderr,/Fictional demo must not be represented/);
});
