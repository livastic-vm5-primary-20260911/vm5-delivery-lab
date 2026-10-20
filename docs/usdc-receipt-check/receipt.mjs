/**
 * Read-only Base native Circle USDC transaction receipt inspector.
 * There is no wallet integration, signature, spending operation or tracking.
 * Proof claims are bounded to the single public RPC endpoint's current answers.
 */
export const BASE_RPC = "https://mainnet.base.org";
export const BASE_CHAIN_ID = "0x2105";
export const CIRCLE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HEX = /^0x[0-9a-fA-F]+$/;
const MONEY = /^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,6})?$/;
const HEX_WORD = /^0x[0-9a-fA-F]{64}$/;
export const RPC_METHODS = Object.freeze(["eth_chainId","eth_getTransactionReceipt","eth_getBlockByNumber"]);

export function parseInput({txHash,recipient,amountUsdc,logIndex=""}){
 if(typeof txHash !== "string" || !HASH.test(txHash.trim())) throw Error("Transaction hash must have 0x followed by 64 hex characters.");
 if(typeof recipient !== "string" || !ADDRESS.test(recipient.trim()) || /^0x0{40}$/i.test(recipient.trim())) throw Error("Enter the non-zero recipient address (0x + 40 hex characters).");
 if(typeof amountUsdc !== "string" || !MONEY.test(amountUsdc.trim())) throw Error("Amount must be positive, with at most 6 USDC decimal places.");
 const [whole,frac=""] = amountUsdc.trim().split(".");
 const amount = BigInt(whole)*1000000n + BigInt(frac.padEnd(6,"0")||"0");
 if(amount === 0n) throw Error("USDC amount must be greater than zero.");
 let log = null;
 if(logIndex !== ""){
  if(typeof logIndex !== "string" || !/^(0|[1-9][0-9]{0,6})$/.test(logIndex.trim())) throw Error("Optional log index must be a nonnegative decimal integer, maximum seven digits.");
  log = BigInt(logIndex.trim());
 }
 return {txHash:txHash.trim().toLowerCase(),recipient:recipient.trim().toLowerCase(),amount,logIndex:log};
}
function fromHex(value,name){
 if(typeof value!=="string" || !HEX.test(value) || value.length>80) throw Error("Malformed RPC "+name+" field.");
 return BigInt(value);
}
function normalAddressTopic(topic){
 if(typeof topic!=="string" || !HEX_WORD.test(topic) || !/^0x0{24}/i.test(topic))return null;
 return "0x"+topic.slice(-40).toLowerCase();
}
export function formatUSDC(amount){
 if(typeof amount!=="bigint" || amount<0n)throw Error("Invalid atomic USDC amount.");
 const whole=amount/1000000n;
 const frac=(amount%1000000n).toString().padStart(6,"0").replace(/0+$/,"");
 return whole.toString()+(frac?"."+frac:"");
}
export function inspectReceipt({txHash,recipient,amount,logIndex},chainId,receipt,finalizedBlock){
 if(chainId !== BASE_CHAIN_ID) throw Error("Refusing result: RPC did not return Base mainnet chain ID 8453.");
 if(receipt===null) return {status:"not_found",reason:"The RPC has no mined receipt for this transaction hash.",finalizedByRpc:false,transfers:[]};
 if(!receipt || typeof receipt!=="object" || String(receipt.transactionHash||"").toLowerCase()!==txHash)throw Error("RPC returned an invalid or different transaction receipt.");
 if(receipt.status!=="0x1") return {status:"failed",reason:"RPC reports a failed or non-successful transaction; no receipt can be credited.",finalizedByRpc:false,transfers:[]};
 const block=fromHex(receipt.blockNumber,"receipt.blockNumber");
 if(typeof receipt.blockHash!=="string" || !HASH.test(receipt.blockHash))throw Error("Malformed RPC receipt blockHash.");
 if(!Array.isArray(receipt.logs)||receipt.logs.length>10000)throw Error("RPC receipt contains malformed or excessive logs.");
 let finalizedByRpc=false;
 if(finalizedBlock && typeof finalizedBlock==="object" && finalizedBlock.number){
  const rpcFinal=fromHex(finalizedBlock.number,"finalized block");
  finalizedByRpc=rpcFinal>=block;
 }
 const observed=[]; const seen=new Set();
 for(const event of receipt.logs){
  if(!event || typeof event!=="object")continue;
  if(String(event.address||"").toLowerCase()!==CIRCLE_USDC)continue;
  if(!Array.isArray(event.topics)||event.topics.length!==3 || String(event.topics[0]).toLowerCase()!==TRANSFER_TOPIC)continue;
  const from=normalAddressTopic(event.topics[1]),to=normalAddressTopic(event.topics[2]);
  if(!from||!to||!HEX_WORD.test(String(event.data||"")))continue;
  if(event.removed===true)continue;
  if(event.transactionHash && String(event.transactionHash).toLowerCase()!==txHash)continue;
  if(event.blockHash && String(event.blockHash).toLowerCase()!==receipt.blockHash.toLowerCase())continue;
  const index=fromHex(event.logIndex,"logIndex");
  if(seen.has(index.toString())) throw Error("RPC reported conflicting duplicate log indices.");
  seen.add(index.toString());
  const atomic=BigInt(event.data);
  observed.push({index:index.toString(),from,to,amount:atomic,amountUsdc:formatUSDC(atomic)});
 }
 const matches=observed.filter(item=>
  item.to===recipient && item.amount===amount &&
  (logIndex===null || BigInt(item.index)===logIndex)
 );
 if(matches.length>1)return {status:"ambiguous",reason:"More than one matching transfer log. Supply its exact log index and review manually.",finalizedByRpc,blockNumber:block.toString(),transfers:observed,matches:matches.length};
 if(matches.length===0)return {status:"mismatch",reason:"No canonical Base Circle USDC Transfer event matches the required recipient, amount and optional log index.",finalizedByRpc,blockNumber:block.toString(),transfers:observed,matches:0};
 return {status:finalizedByRpc?"rpc_finalized_match":"rpc_unfinalized_match",
  reason:finalizedByRpc?"One matching canonical USDC event is inside a block the queried RPC currently labels finalized.":"One matching canonical USDC event is reported, but the queried RPC's finalized block has not reached it.",
  finalizedByRpc,blockNumber:block.toString(),matchedLogIndex:matches[0].index,transfers:observed,matches:1};
}

export async function rpcRead(method,params,fetcher=fetch){
 if(!RPC_METHODS.includes(method))throw Error("Refusing non-read-only RPC method.");
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),9000);
 try{
  const res=await fetcher(BASE_RPC,{method:"POST",mode:"cors",credentials:"omit",cache:"no-store",redirect:"error",referrerPolicy:"no-referrer",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({jsonrpc:"2.0",method,params,id:1}),signal:abort.signal});
  if(!res.ok)throw Error("Base public RPC returned HTTP "+res.status+"; stop rather than retrying through another provider.");
  const raw=await res.text();
  if(raw.length>6000000)throw Error("Refusing unexpectedly large public RPC response.");
  const body=JSON.parse(raw);
  if(body?.jsonrpc!=="2.0" || body?.id!==1 || body.error || !Object.hasOwn(body,"result"))throw Error("Base RPC error or unexpected response.");
  return body.result;
 } finally{clearTimeout(timer);}
}
export async function verifyOnBase(raw,caller=rpcRead){
 const requested=parseInput(raw);
 const chain=await caller("eth_chainId",[]);
 if(chain!==BASE_CHAIN_ID)throw Error("RPC chain ID mismatch; no verification is possible.");
 const receipt=await caller("eth_getTransactionReceipt",[requested.txHash]);
 if(receipt===null)return inspectReceipt(requested,chain,null,null);
 const finalized=await caller("eth_getBlockByNumber",["finalized",false]);
 return inspectReceipt(requested,chain,receipt,finalized);
}
