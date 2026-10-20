import {audit,summaryCsv} from "./audit.mjs";
const $ = id => document.getElementById(id);
const sample = {
  funding: "batch_id,amount,currency,status\nB-OCT,5000,EUR,funded\nB-NOV,1200,EUR,pending",
  invoices: "invoice_id,payout_id,amount,currency\nINV-001,P-001,100,USD\nINV-002,P-002,220,USDC\nINV-003,P-003,125,EUR\nINV-004,P-004,80,USDT\nINV-005,P-005,75,EUR",
  payouts: "payout_id,invoice_id,batch_id,sent_amount,sent_currency,received_amount,received_currency,status\nP-001,INV-001,B-OCT,100,USD,100,USDC,paid\nP-002,INV-002,B-OCT,200,USDC,200,USDC,paid\nP-003,INV-003,B-OCT,125,EUR,132,USDT,pending\nP-004,INV-004,B-OCT,80,USDT,80,USDT,returned\nP-005,INV-005,B-NOV,75,EUR,75,EUR,paid\nP-006,INV-UNKNOWN,B-OCT,30,USD,30,USDC,paid"
};
let current = null;
function status(message, error=false) {
  $("status").textContent = message;
  $("status").dataset.kind = error ? "error" : "ok";
}
function loadSample() {
  for (const k of Object.keys(sample)) { $(k).value = sample[k]; $(k+"-file").value = ""; }
  status("Fictional sample loaded. Click Find reported exceptions.");
  $("results").hidden = true; $("download").disabled = true; current=null;
}
function row(target, cells) {
  const tr = document.createElement("tr");
  for (const t of cells) {const td=document.createElement("td"); td.textContent=String(t);tr.appendChild(td);}
  target.appendChild(tr);
}
function present(r) {
  $("results").hidden = false;
  $("invoice-count").textContent = r.summary.invoiceRows;
  $("matched-count").textContent = r.summary.reportedConsistent;
  $("issue-count").textContent = r.summary.reviewIssues;
  $("batch-count").textContent = r.summary.fundingRows;
  const ex=$("exceptions"); ex.replaceChildren();
  for (const issue of r.issues) row(ex,[issue.source, issue.row,issue.kind.replaceAll("_"," "),issue.message]);
  if (!r.issues.length) row(ex,["—","—","No format exceptions found","Reported data is still NOT independently verified"]);
  const bs=$("batches");bs.replaceChildren();
  for (const b of r.batches) row(bs,[b.fundingRow,b.payouts,b.crossCurrency?"Yes; cannot net FX":"No cross-currency payout in input",b.possibleDifference]);
  status("Local-only check completed. "+r.summary.reviewIssues+" review findings; no bank or chain receipts verified.");
  $("download").disabled=false; current=r;
}
function run() {
  $("download").disabled=true; current=null;
  try { present(audit({funding:$("funding").value,invoices:$("invoices").value,payouts:$("payouts").value})); }
  catch(e) {$("results").hidden=true;status("CSV error: "+e.message,true);}
}
function save() {
  if(!current)return;
  const blob=new Blob([summaryCsv(current)],{type:"text/csv;charset=utf-8"});
  const u=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=u; a.download="local-payout-exceptions-id-free.csv"; document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(u);
}
for(const key of ["funding","invoices","payouts"]) {
  $(key+"-file").addEventListener("change",async event=>{
    const f=event.target.files && event.target.files[0]; if(!f)return;
    if(f.size>65536) {status(key+": File exceeds 64 KiB",true);return;}
    $(key).value=await f.text();$("results").hidden=true;$("download").disabled=true;
    status(key+": Local CSV file read. Nothing uploaded. Run to validate.");
  });
}
$("sample").addEventListener("click",loadSample);
$("run").addEventListener("click",run);
$("download").addEventListener("click",save);
loadSample();
run();
