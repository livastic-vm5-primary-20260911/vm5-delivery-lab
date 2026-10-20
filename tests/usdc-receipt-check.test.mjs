import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
 CIRCLE_USDC,BASE_CHAIN_ID,BASE_RPC,TRANSFER_TOPIC,
 parseInput,formatUSDC,inspectReceipt,verifyOnBase,rpcRead
} from "../docs/usdc-receipt-check/receipt.mjs";

const hash="0x"+"a".repeat(64), bh="0x"+"b".repeat(64);
const addr="0x"+"2".repeat(40), from="0x"+"1".repeat(40);
const topic =address=>"0x"+"0".repeat(24)+address.slice(2).toLowerCase();
function make(){
 const raw={txHash:hash,recipient:addr,amountUsdc:"0.25",logIndex:"3"};
 const event={address:CIRCLE_USDC,transactionHash:hash,blockHash:bh,logIndex:"0x3",
  topics:[TRANSFER_TOPIC,topic(from),topic(addr)],
  data:"0x"+(250000n).toString(16).padStart(64,"0")};
 const receipt={status:"0x1",transactionHash:hash,blockNumber:"0x64",blockHash:bh,logs:[event]};
 return {raw,event,receipt,finalized:{number:"0x65"}};
}
test("Read-only RPC genuine basic matched event and finalized-tag semantics",()=>{
 const {raw,receipt,finalized}=make();
 const result=inspectReceipt(parseInput(raw),BASE_CHAIN_ID,receipt,finalized);
 assert.equal(result.status,"rpc_finalized_match");assert.equal(result.finalizedByRpc,true);
 assert.equal(result.matches,1);assert.equal(result.matchedLogIndex,"3");
 assert.equal(result.transfers[0].to,addr);assert.equal(result.transfers[0].amountUsdc,"0.25");
 assert.equal(result.blockNumber,"100");
});
test("Transaction included but RPC finality tag behind is provisional only",()=>{
 const f=make();f.finalized.number="0x63";
 const result=inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized);
 assert.equal(result.status,"rpc_unfinalized_match");assert.equal(result.finalizedByRpc,false);
});
test("Failed transaction and missing receipt never mark paid",()=>{
 const f=make();
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,null,null).status,"not_found");
 f.receipt.status="0x0";
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"failed");
});
test("Always refuse RPC of the wrong chain or the wrong tx hash",()=>{
 const f=make();
 assert.throws(()=>inspectReceipt(parseInput(f.raw),"0x1",f.receipt,f.finalized),/chain ID/);
 f.receipt.transactionHash="0x"+"f".repeat(64);
 assert.throws(()=>inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized),/different/);
});
test("Wrong token, wrong receiver and wrong amount fail to match",()=>{
 const f=make();f.event.address="0x"+"3".repeat(40);
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"mismatch");
 f.event.address=CIRCLE_USDC;f.event.topics[2]=topic("0x"+"4".repeat(40));
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"mismatch");
 f.event.topics[2]=topic(addr);f.event.data="0x"+(200000n).toString(16).padStart(64,"0");
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"mismatch");
});
test("Only exact unique indexed Transfer topic works",()=>{
 const f=make();f.event.topics[0]="0x"+"f".repeat(64);
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"mismatch");
 f.event.topics[0]=TRANSFER_TOPIC;
 f.raw.logIndex="4";
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"mismatch");
});
test("Repeated matching token transfers without an explicit log index are ambiguous",()=>{
 const f=make();f.raw.logIndex="";
 const second={...f.event,logIndex:"0x4"};
 f.receipt.logs.push(second);
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"ambiguous");
});
test("RPC duplicate log indices or mismatched log blocks fail closed",()=>{
 const f=make();f.receipt.logs.push({...f.event});
 assert.throws(()=>inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized),/duplicate/);
 f.receipt.logs.pop();f.event.blockHash="0x"+"c".repeat(64);
 assert.equal(inspectReceipt(parseInput(f.raw),BASE_CHAIN_ID,f.receipt,f.finalized).status,"mismatch");
});
test("Strict input rejects injections, seed-like/invalid addresses, bad amount and indexes",()=>{
 const f=make();assert.throws(()=>parseInput({...f.raw,txHash:"=HYPERLINK(1)"}));
 assert.throws(()=>parseInput({...f.raw,recipient:"0x"+"0".repeat(40)}));
 assert.throws(()=>parseInput({...f.raw,recipient:"private key"}));
 assert.throws(()=>parseInput({...f.raw,amountUsdc:"0"}));
 assert.throws(()=>parseInput({...f.raw,amountUsdc:"0.0000001"}));
 assert.throws(()=>parseInput({...f.raw,amountUsdc:"1e9"}));
 assert.throws(()=>parseInput({...f.raw,logIndex:"-1"}));
 assert.throws(()=>parseInput({...f.raw,logIndex:"0x2"}));
 assert.equal(parseInput(f.raw).amount,250000n);
 assert.equal(formatUSDC(1000000n),"1");
 assert.equal(formatUSDC(1n),"0.000001");
});
test("Read-only three RPC calls verify public receipt and reject other methods",async()=>{
 const f=make();const calls=[];
 const fake=async(method,params)=>{calls.push([method,params]);return method==="eth_chainId"?BASE_CHAIN_ID:method==="eth_getTransactionReceipt"?f.receipt:f.finalized};
 const r=await verifyOnBase(f.raw,fake);
 assert.equal(r.status,"rpc_finalized_match");
 assert.deepEqual(calls.map(x=>x[0]),["eth_chainId","eth_getTransactionReceipt","eth_getBlockByNumber"]);
 assert.deepEqual(calls[2][1],["finalized",false]);
 await assert.rejects(rpcRead("eth_sendTransaction",[],fake),/non-read-only/);
});
test("RPC wrong chain causes no receipt fetch and missing receipt causes no finalized-block fetch",async()=>{
 const f=make();let n=0;
 await assert.rejects(verifyOnBase(f.raw,async()=>{n++;return "0x1";}),/chain ID/);
 assert.equal(n,1);
 n=0;const r=await verifyOnBase(f.raw,async(method)=>{n++;return method==="eth_chainId"?BASE_CHAIN_ID:null;});
 assert.equal(r.status,"not_found");assert.equal(n,2);
});
test("Read-only HTTPS transport uses no credential forwarding or alternative providers",async()=>{
 const calls=[];
 const fake=async(url,opts)=>{calls.push({url,opts});return {ok:true,text:async()=>JSON.stringify({jsonrpc:"2.0",id:1,result:BASE_CHAIN_ID})}};
 assert.equal(await rpcRead("eth_chainId",[],fake),BASE_CHAIN_ID);
 assert.equal(calls[0].url,BASE_RPC);assert.equal(calls[0].opts.credentials,"omit");
 assert.equal(calls[0].opts.redirect,"error");
 assert.equal(calls[0].opts.referrerPolicy,"no-referrer");
 assert.deepEqual(JSON.parse(calls[0].opts.body).params,[]);
});
test("Public page has explicit RPC opt-in and cross-links standalone local CSV mode",async()=>{
 const root=new URL("../docs/usdc-receipt-check/",import.meta.url);
 const html=await readFile(new URL("index.html",root),"utf8");
 const app=await readFile(new URL("app.mjs",root),"utf8");
 assert.match(html,/connect-src https:\/\/mainnet\.base\.org/);
 assert.match(html,/No wallet connection/);
 assert.ok(html.includes("usdc-invoice-bridge"));
 assert.match(html,/Verify against Base RPC/);
 assert.ok(html.includes("1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g"));
 assert.match(html,/unpaid, candid feedback/);
 assert.match(app,/addEventListener\("submit"/);
 assert.doesNotMatch(app,/localStorage|sessionStorage|ethereum\.request|eth_sendTransaction/);
});
