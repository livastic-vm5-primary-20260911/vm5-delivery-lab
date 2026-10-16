import { auditOpenApiText, DEMO_SPEC } from "./engine.mjs";

// VM5 contract checker: every input stays in this browser's JavaScript heap.
// No telemetry, fetch, network proxy, localStorage, or service worker is used.
const byId=id=>document.getElementById(id);
const input=byId("spec-input");
const characterCount=byId("character-count");
const status=byId("result-status");
const findingsList=byId("issue-list");
const filter=byId("severity-filter");
const fileInput=byId("file-picker");
const MAX_BYTES=1100000;
let current=null;

function countCharacters() {
  characterCount.textContent=input.value.length.toLocaleString("en-US")+" characters";
}
function showIdle() {
  byId("initial-panel").hidden=false;
  byId("report-panel").hidden=true;
  status.textContent="NOT YET ANALYZED";
  current=null;
}
function textNode(tag,className,text) {
  const node=document.createElement(tag);
  if(className) node.className=className;
  node.textContent=String(text);
  return node;
}
function makeFinding(issue) {
  const li=document.createElement("li");
  li.className="issue";
  const top=textNode("div","issue-top","");
  const sev=textNode("span","severity "+issue.severity,issue.severity);
  const code=textNode("span","rule-code",issue.code);
  top.append(sev,code);
  li.append(top,textNode("h3","",issue.message),textNode("p","pointer",issue.where),textNode("p","fix","Next step: "+issue.fix));
  return li;
}
function renderFindings() {
  if(!current)return;
  findingsList.replaceChildren();
  const wanted=filter.value;
  const chosen=current.issues.filter(issue=>wanted==="all"||issue.severity===wanted);
  const capped=chosen.slice(0,200);
  const fragment=document.createDocumentFragment();
  for(const i of capped)fragment.appendChild(makeFinding(i));
  findingsList.appendChild(fragment);
  byId("no-issues").hidden=chosen.length>0;
  if(chosen.length>200) findingsList.appendChild(textNode("li","no-issues","Showing 200 of "+chosen.length+" findings. Download the complete report for all findings."));
}
function renderReport(result) {
  current=result;
  byId("initial-panel").hidden=true;
  byId("report-panel").hidden=false;
  byId("error-count").textContent=result.summary.errors;
  byId("warning-count").textContent=result.summary.warnings;
  byId("note-count").textContent=result.summary.notes;
  const amount=result.issues.length;
  status.textContent=amount?amount+" FINDINGS":"NO FINDINGS";
  byId("report-meta").textContent=result.summary.paths+" path(s) · "+result.summary.operations+" operation(s) inspected · "+amount+" static findings";
  filter.value="all";
  renderFindings();
}
function run() {
  const result=auditOpenApiText(input.value);
  renderReport(result);
}
function loadDemo() {
  input.value=DEMO_SPEC;
  countCharacters();
  run();
  input.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function clearInput() {
  input.value="";
  fileInput.value="";
  countCharacters();
  showIdle();
  input.focus();
}
function safeTableCell(value) {
  return String(value).replaceAll("\r"," ").replaceAll("\n"," ").replaceAll("|","\\|");
}
function makeMarkdown(r) {
  const lines=[
    "# OpenAPI Contract Preflight",
    "",
    "Produced locally in the browser by VM5 Delivery Lab's static JSON checker.",
    "",
    "**Summary:** "+r.summary.errors+" errors, "+r.summary.warnings+" warnings, "+r.summary.notes+" notes.",
    "**Coverage:** "+r.summary.paths+" paths, "+r.summary.operations+" operations.",
    "",
    "This report is advisory; it does not certify specification conformance, availability, authorization or security.",
    "",
    "| Severity | Rule | JSON pointer | Observation | Suggested next step |",
    "| --- | --- | --- | --- | --- |"
  ];
  for(const f of r.issues) lines.push("| "+[f.severity,f.code,f.where,f.message,f.fix].map(safeTableCell).join(" | ")+" |");
  lines.push("","Generated with the source-available VM5 Delivery Lab API preflight. The original specification is never included in this export.","");
  return lines.join("\n");
}
function exportReport(){
  if(!current)return;
  const data=makeMarkdown(current);
  const file=new Blob([data],{type:"text/markdown;charset=utf-8"});
  const blobUrl=URL.createObjectURL(file);
  const link=document.createElement("a");
  link.href=blobUrl;
  link.download="openapi-preflight-findings.md";
  link.style.display="none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(blobUrl),1500);
}

byId("sample-button").addEventListener("click",loadDemo);
byId("sample-shortcut").addEventListener("click",loadDemo);
byId("clear-button").addEventListener("click",clearInput);
byId("check-button").addEventListener("click",run);
byId("file-button").addEventListener("click",()=>fileInput.click());
byId("download-button").addEventListener("click",exportReport);
filter.addEventListener("change",renderFindings);
input.addEventListener("input",()=>{
  countCharacters();
  if(current){current=null;status.textContent="INPUT CHANGED · RUN AGAIN";byId("report-panel").hidden=true;byId("initial-panel").hidden=false;}
});
fileInput.addEventListener("change",async()=>{
  const file=fileInput.files?.[0];
  if(!file)return;
  if(file.size>MAX_BYTES) {
    input.value="";
    countCharacters();
    renderReport(auditOpenApiText("x".repeat(750001)));
    byId("report-meta").textContent="The selected file exceeds the browser preflight size limit.";
    fileInput.value="";
    return;
  }
  try{
    input.value=await file.text();
    countCharacters();
    run();
  }catch(e){
    input.value="";
    countCharacters();
    showIdle();
    byId("input-guidance").textContent="Could not open this file. Please try a UTF-8 JSON file.";
  }finally{fileInput.value=""}
});
countCharacters();
showIdle();
