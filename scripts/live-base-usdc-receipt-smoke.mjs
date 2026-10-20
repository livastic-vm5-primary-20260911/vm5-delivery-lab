/**
 * Manual, non-automated public RPC smoke check.
 * Reads a single finalized Base block and one canonical native USDC Transfer
 * event, then verifies it against the same public RPC. No wallet or funds.
 */
import {verifyOnBase,CIRCLE_USDC,TRANSFER_TOPIC,BASE_RPC} from "../docs/usdc-receipt-check/receipt.mjs";
async function read(method,params) {
 const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),11000);
 try{
  const response=await fetch(BASE_RPC,{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({jsonrpc:"2.0",id:10,method,params}),
   credentials:"omit",redirect:"error",referrerPolicy:"no-referrer",signal:ac.signal
  });
  if(!response.ok)throw Error("RPC HTTP "+response.status);
  const data=await response.json();
  if(data.error)throw Error("Public RPC refused "+method+": "+JSON.stringify(data.error).slice(0,250));
  return data.result;
 } finally{clearTimeout(timer);}
}
try{
 const block=await read("eth_getBlockByNumber",["finalized",false]);
 if(!block?.number)throw Error("Finalized block unavailable.");
 const logs=await read("eth_getLogs",[{fromBlock:block.number,toBlock:block.number,address:CIRCLE_USDC,topics:[TRANSFER_TOPIC]}]);
 if(!Array.isArray(logs))throw Error("No valid Transfer log array from the public RPC.");
 const event=logs.find(e=>Array.isArray(e.topics)&&e.topics.length===3 && /^0x0{24}[0-9a-fA-F]{40}$/.test(e.topics[2]) && /^0x[0-9a-fA-F]{64}$/.test(e.data) && BigInt(e.data)>0n);
 if(!event){
  process.stdout.write(JSON.stringify({result:"not_tested_no_transfer_in_one_finalized_block",block:block.number,transfers:logs.length})+"\n");
 }else{
  const decimal=BigInt(event.data);
  const result=await verifyOnBase({
   txHash:event.transactionHash,
   recipient:"0x"+event.topics[2].slice(-40),
   amountUsdc:(decimal/1000000n).toString()+"."+String(decimal%1000000n).padStart(6,"0"),
   logIndex:BigInt(event.logIndex).toString()
  });
  process.stdout.write(JSON.stringify({result:result.status,block:block.number,usdcEventCountInBlock:logs.length,
   matchedLogIndex:result.matchedLogIndex??null,rpcFinalizedByProvider:result.finalizedByRpc,matchedCount:result.matches??0,
   caveat:"Read-only official RPC observation, not independent consensus or accounting certification"})+"\n");
  if(result.status!=="rpc_finalized_match")process.exitCode=2;
 }
}catch(err){process.stderr.write("Read-only smoke unavailable: "+err.message+"\n");process.exitCode=1;}
