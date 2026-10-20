import {evaluatePayoutCsv,LIMITS,SYNTHETIC_SAMPLE,BASE_USDC} from "./checker.mjs";
const byId=id=>document.getElementById(id);
const input=byId("csv-input"),file=byId("csv-file"),output=byId("results");
const status=byId("status"),summary=byId("summary"),issues=byId("issues");
const reportButton=byId("download-report");
let lastReport=null;
function note(message,negative=false){
  status.textContent=message;
  status.dataset.kind=negative?"error":"neutral";
}
function clearOutput(){
  lastReport=null;
  output.hidden=true;
  reportButton.disabled=true;
  summary.replaceChildren();
  issues.replaceChildren();
}
function textCell(type,text){
  const x=document.createElement(type);
  x.textContent=String(text);
  return x;
}
function stat(name,value){
  const element=document.createElement("div");
  element.className="stat";
  element.append(textCell("span",name),textCell("strong",value));
  return element;
}
function render(result){
  clearOutput();lastReport=result;output.hidden=false;
  summary.append(
    stat("CSV data rows",result.inspectedRows),
    stat("Syntactically valid unique rows",result.acceptedSyntaxRows),
    stat("Errors",result.errorCount),
    stat("Warnings",result.warningCount),
    stat("Total of valid rows only (not a payment)",result.validRowsPartialTotalUSDC+" USDC")
  );
  for(const i of result.issues){
    const li=document.createElement("li");
    li.className=i.severity==="error"?"error":"warning";
    const h=textCell("strong",i.severity.toUpperCase()+" · "+i.code);
    const where=textCell("span","Row "+i.row+(i.column?", column "+i.column:""));
    const detail=textCell("p",i.message);
    li.append(h,where,detail);
    issues.append(li);
  }
  if(result.issuesTruncated){
    const li=document.createElement("li");
    li.append(textCell("strong","More issues omitted"),textCell("p","The JSON summary contains only the first "+LIMITS.issues+" issue locations. Resolve those and rerun."));
    issues.append(li);
  }
  if(!result.totalIssueCount){
    const li=document.createElement("li");
    li.className="pass";
    li.append(textCell("strong","No structural issues found"),textCell("p","This does NOT prove address ownership, EIP-55 checksum, token contract, sufficient balance or payment authorization."));
    issues.append(li);
  }
  reportButton.disabled=false;
  note(result.errorCount?result.errorCount+" data errors found. Fix before any external payout.":"Review complete. Do not transfer money based solely on these checks.",!!result.errorCount);
}
byId("check").addEventListener("click",()=>{
  clearOutput();
  try{
    if(input.value.length>LIMITS.bytes){
      // TextEncoder below ensures the actual UTF-8 byte bound.
      note("Input appears too large; maximum 64 KiB.",true);return;
    }
    render(evaluatePayoutCsv(input.value));
  }catch(err){
    note("No review available: "+(err instanceof Error?err.message:"Invalid input."),true);
  }
});
byId("sample").addEventListener("click",()=>{
  input.value=SYNTHETIC_SAMPLE;
  clearOutput();note("Synthetic demonstration loaded. It contains intentional errors. Nothing has been sent.");
});
byId("clear").addEventListener("click",()=>{
  input.value="";
  file.value="";
  clearOutput();note("Input cleared. Nothing is uploaded or stored by this page.");
});
file.addEventListener("change",async()=>{
  clearOutput();
  const chosen=file.files?.[0];
  if(!chosen)return;
  if(chosen.size>LIMITS.bytes){
    file.value="";note("CSV file exceeds 64 KiB; no content read.",true);return;
  }
  try{
    const bytes=await chosen.arrayBuffer();
    // A local read, without making a network request.
    const csv=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    input.value=csv;
    note("Loaded "+bytes.byteLength+" UTF-8 bytes locally. Choose Review CSV to inspect.");
  }catch{
    note("Unable to read as UTF-8 CSV. File was not uploaded.",true);
  }finally{file.value="";}
});
reportButton.addEventListener("click",()=>{
  if(!lastReport)return;
  const json=JSON.stringify(lastReport,null,2)+"\n";
  // Results contain diagnostic codes and ROW NUMBERS only — no raw addresses.
  const blob=new Blob([json],{type:"application/json;charset=utf-8"});
  const uri=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=uri;a.download="base-usdc-payout-csv-local-syntax-report.json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(uri),1000);
});
byId("copy-wallet").addEventListener("click",async()=>{
  const wallet="0x6b01efA0705E91a7aca54271510bf9e594717f34";
  try{
    await navigator.clipboard.writeText(wallet);
    byId("wallet-status").textContent="Address copied. Optional tips only. Confirm Base network, canonical USDC and address independently; this is NOT a paid API checkout.";
  }catch{
    byId("wallet-status").textContent="Browser denied clipboard access. Select the public address displayed above manually.";
  }
});
byId("contract").textContent=BASE_USDC;
note("Ready: paste CSV or choose a local file. Click Try example to see real issue detection. No data leaves your browser.");
