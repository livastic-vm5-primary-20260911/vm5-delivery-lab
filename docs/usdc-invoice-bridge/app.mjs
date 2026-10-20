import {SYNTHETIC,reconcile,reportCsv,evidenceIndexCsv} from "./engine.mjs";
const $=s=>document.getElementById(s);
let last=null;
function msg(s,kind="info"){$("status").textContent=s;$("status").dataset.kind=kind;}
function load(){
 $("invoices").value=SYNTHETIC.invoices;$("events").value=SYNTHETIC.transfers;
 $("report").hidden=true;$("export").disabled=true;$("evidence-export").disabled=true;last=null;
 msg("Synthetic example loaded only in this tab. Click Compare locally; no real wallet data or network.");
}
function clear(){
 $("report").hidden=true;last=null;$("export").disabled=true;$("evidence-export").disabled=true;
 msg("Input changed. Click Compare locally; nothing is uploaded.");
}
function show(){
 const r=reconcile($("invoices").value,$("events").value);
 last=r;$("report").hidden=false;
 $("summary").textContent="Invoices "+r.summary.invoiceCount+" • example reported exact "+r.summary.reportedExact+" • partial "+r.summary.reportedPartial+" • duplicate event rows "+r.summary.duplicateEventRows+" • unreferenced "+r.summary.unreferencedEvents+" • pending "+r.summary.pendingReported;
 const tbody=$("rows");tbody.replaceChildren();
 for(const row of r.invoices){
  const tr=document.createElement("tr");
  for(const name of ["invoice_id","status","expected_usdc","reported_finalized_usdc","reported_difference_usdc"]){
   const td=document.createElement("td");td.textContent=String(row[name]);tr.append(td);
  }
  tbody.append(tr);
 }
 const manual=$("manual");manual.replaceChildren();
 for(const e of r.manualReview){
  const li=document.createElement("li");
  li.textContent=e.kind+" • reported event "+e.eventKey.substring(0,35)+"… • candidates: "+(e.candidateInvoiceIds.join(", ")||"none");
  manual.append(li);
 }
 if(!r.manualReview.length){const li=document.createElement("li");li.textContent="None in the supplied files.";manual.append(li);}
 $("export").disabled=false;$("evidence-export").disabled=false;
 msg("Local CSV matching complete. These are user-supplied records, NOT authenticated on-chain proof or a formal invoice reconciliation.", "ok");
}
function save(){
 if(!last)throw Error("Run a local comparison first.");
 const data=reportCsv(last);
 const blob=new Blob([data],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="reported-invoice-candidate-statuses.csv";
 a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 msg("Export created locally; includes ONLY invoice IDs and candidate-status counts, not wallet addresses or transaction hashes.","ok");
}
function saveEvidence(){
 if(!last)throw Error("Compare two CSVs first.");
 // This separate opt-in includes public transaction hashes and wallet
 // addresses from the browser tab; nothing is sent to our server.
 const contents=evidenceIndexCsv($("invoices").value,$("events").value);
 const url=URL.createObjectURL(new Blob([contents],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a");
 link.href=url;link.download="unverified-usdc-event-review-index.csv";
 link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 msg("Local evidence-index CSV saved. Addresses and transaction hashes are included; every event is UNVERIFIED CSV input, not proof of funds or accounting finality.","ok");
}
async function loadFile(input,target){
 const file=input.files?.[0];if(!file)return;
 if(file.size>65536)throw Error("Each file must be <=64 KiB.");
 const text=await file.text();$(target).value=text;clear();
 msg("Selected file read locally. No data uploaded.");
}
function start(){
 $("example").addEventListener("click",load);
 $("compare").addEventListener("click",()=>{try{show()}catch(e){msg(e.message,"error")}});
 $("export").addEventListener("click",()=>{try{save()}catch(e){msg(e.message,"error")}});
 $("evidence-export").addEventListener("click",()=>{try{saveEvidence()}catch(e){msg(e.message,"error")}});
 for(const name of ["invoices","events"]) $(name).addEventListener("input",clear);
 for(const [name,target] of [["invoice-file","invoices"],["event-file","events"]]){
  $(name).addEventListener("change",()=>loadFile($(name),target).catch(e=>msg(e.message,"error")));
 }
 load();
}
start();
