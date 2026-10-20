import {EXAMPLE,inspectFunnel} from "./engine.mjs";
const el=(id)=>document.getElementById(id);
let aggregate=null;
function status(message,kind="info"){el("status").textContent=message;el("status").dataset.kind=kind;}
function report(data){
 const ids={
  "total-attempts":data.attempts,"quoted":data.quoted,"retried":data.retried,
  "settled":data.settlementReported,"delivered":data.deliveredWithSettlement,
  "ratio":data.quoteToReportedDeliveryPercent===null?"—":data.quoteToReportedDeliveryPercent.toFixed(2)+"%",
  "invalid":data.invalidBeforeQuote,"quote-only":data.quotedNoRetry,
  "retry-no-pay":data.retryNoSettlement,"pay-no-delivery":data.settlementNoDelivery,
  "reused-ref":data.duplicatePaymentRefs
 };
 for(const [id,n] of Object.entries(ids))el(id).textContent=String(n);
 const tbody=el("resource-rows");tbody.replaceChildren();
 for(const item of data.resources){
  const tr=document.createElement("tr");
  for(const value of [item.resource,item.quoted,item.retried,item.deliveredWithSettlement]){
   const td=document.createElement("td");td.textContent=String(value);tr.append(td);
  }
  tbody.append(tr);
 }
 el("results").hidden=false;
 el("download").disabled=false;
}
el("load-example").addEventListener("click",()=>{
 el("events").value=EXAMPLE;el("results").hidden=true;el("download").disabled=true;
 aggregate=null;status("Invented-only example loaded locally. Click Analyze locally. No network calls.");
});
el("analyze").addEventListener("click",()=>{
 aggregate=null;el("results").hidden=true;el("download").disabled=true;
 try{
  const data=inspectFunnel(el("events").value);
  aggregate=data;report(data);
  status("Local self-reported event aggregation complete. No uploads, wallet access or onchain verification were performed.",
   data.duplicatePaymentRefs?"warn":"ok");
 }catch(error){
  status("No reliable funnel established: "+(error?.message||"Invalid synthetic CSV")+". Fix the CSV and try again.","error");
 }
});
el("download").addEventListener("click",()=>{
 if(!aggregate)return;
 // Only aggregate counts and public route labels; never raw IDs, refs, timestamps or source CSV.
 const data=JSON.stringify(aggregate,null,2)+"\n";
 const blob=new Blob([data],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 try{
  const a=document.createElement("a");a.href=url;a.download="x402-operator-reported-aggregate.json";
  document.body.append(a);a.click();a.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
