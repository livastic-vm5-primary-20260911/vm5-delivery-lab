import {verifyOnBase} from "./receipt.mjs";
const $=id=>document.getElementById(id);
function status(message,kind="info"){$("status").textContent=message;$("status").dataset.kind=kind;}
function show(data){
 $("result").hidden=false;
 $("verdict").textContent=({
  rpc_finalized_match:"MATCH — included in RPC-reported finalized block",
  rpc_unfinalized_match:"MATCH — not yet finalized according to this RPC",
  ambiguous:"MULTIPLE MATCHES — log index required",
  mismatch:"NO MATCH for expected recipient, amount and log index",
  failed:"TRANSACTION FAILED according to this RPC",
  not_found:"NO MINED RECEIPT returned by this RPC"
 })[data.status]||"MANUAL REVIEW REQUIRED";
 $("reason").textContent=data.reason;
 $("finality").textContent="RPC finalized tag covers tx block: "+(data.finalizedByRpc?"YES (provider report only)":"NO or unavailable")+(data.blockNumber?" • tx block "+data.blockNumber:"");
 $("count").textContent="Canonical Circle USDC Transfer events reported in this receipt: "+data.transfers.length+(data.transfers.length>30?" (showing first 30)":"");
 const rows=$("rows");rows.replaceChildren();
 for(const ev of data.transfers.slice(0,30)){
  const tr=document.createElement("tr");
  for(const value of [ev.index,ev.to,ev.amountUsdc]){
   const td=document.createElement("td");
   td.textContent=String(value);
   tr.append(td);
  }
  rows.append(tr);
 }
 if(!data.transfers.length){
  const tr=document.createElement("tr");const td=document.createElement("td");
  td.colSpan=3;td.textContent="No canonical Circle USDC Transfer logs returned for this receipt.";tr.append(td);rows.append(tr);
 }
}
$("checker").addEventListener("submit",async event=>{
 event.preventDefault();
 $("result").hidden=true;
 $("verify-button").disabled=true;
 status("Reading Base chain ID, public transaction receipt and RPC finalized-tag block. No wallet connection or transaction signing.");
 try{
  const r=await verifyOnBase({
   txHash:$("tx-hash").value,
   recipient:$("recipient").value,
   amountUsdc:$("amount").value,
   logIndex:$("log-index").value.trim()
  });
  show(r);
  status(r.status==="rpc_finalized_match"?
   "RPC-reported matched USDC Transfer found in a finalized-tag block. Independently verify when material.":
   "RPC check complete. Treat this result as an exception or provisional observation, not evidence of a paid invoice.",
   r.status==="rpc_finalized_match"?"ok":"info");
 }catch(e){
  status("No verification established: "+(e?.message||"unknown RPC/browser error")+". Do not assume payment.", "error");
 }finally{$("verify-button").disabled=false;}
});
