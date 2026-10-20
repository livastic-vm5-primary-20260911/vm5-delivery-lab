/**
 * Local-only synthetic/anonymized x402 merchant funnel analysis.
 * This is a *reported event* inspector, not a blockchain verifier or finance ledger.
 */
export const HEADER="attempt_id,resource,event,payment_ref,timestamp";
const ALLOWED=new Set(["sample","invalid_before_quote","quote","signed_retry","settled","delivered"]);
const ORDER={invalid_before_quote:-1,sample:0,quote:1,signed_retry:2,settled:3,delivered:4};
const ID=/^[A-Za-z0-9_-]{1,48}$/;
const REF=/^[A-Za-z0-9_-]{1,64}$/;
const RESOURCE=/^\/[A-Za-z0-9/_-]{1,119}$/;
const ISOTIME=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
export const LIMITS=Object.freeze({maxUtf8Bytes:65536,maxRows:500,maxResources:25,maxColumns:5});
export const EXAMPLE=[
HEADER,
"a1,/v1/report,quote,,2026-10-20T10:00:00Z",
"a1,/v1/report,signed_retry,,2026-10-20T10:00:01Z",
"a1,/v1/report,settled,pay_a1,2026-10-20T10:00:02Z",
"a1,/v1/report,delivered,pay_a1,2026-10-20T10:00:03Z",
"a2,/v1/report,quote,,2026-10-20T10:01:00Z",
"a3,/v1/report,quote,,2026-10-20T10:02:00Z",
"a3,/v1/report,signed_retry,,2026-10-20T10:02:01Z",
"a4,/v1/report,quote,,2026-10-20T10:03:00Z",
"a4,/v1/report,signed_retry,,2026-10-20T10:03:01Z",
"a4,/v1/report,settled,pay_a4,2026-10-20T10:03:02Z",
"a5,/v1/report,invalid_before_quote,,2026-10-20T10:04:00Z"
].join("\n");

function fail(message){throw new Error(message);}
export function parseCsv(input){
 if(typeof input!=="string")fail("CSV must be a UTF-8 text string.");
 if(new TextEncoder().encode(input).length>LIMITS.maxUtf8Bytes)fail("CSV exceeds the 64 KiB local input limit.");
 if(input.startsWith("\uFEFF"))input=input.slice(1);
 if(input.includes("\0"))fail("NUL bytes are not allowed.");
 const records=[];let row=[],cell="",inQuote=false,afterQuote=false;
 let i=0,atRecordStart=true;
 function pushCell(){
  if(cell.length>512)fail("CSV cell is too long.");
  row.push(cell);cell="";afterQuote=false;
  if(row.length>LIMITS.maxColumns)fail("Too many CSV columns.");
 }
 function pushRow(){
  pushCell();
  if(!(row.length===1&&row[0]==="")){
   records.push(row);
   if(records.length>LIMITS.maxRows+1)fail("CSV exceeds 500 data rows.");
  }
  row=[];atRecordStart=true;
 }
 while(i<input.length){
  const ch=input[i++];
  if(inQuote){
   if(ch==='"'&&input[i]==='"'){cell+='"';i++;}
   else if(ch==='"'){inQuote=false;afterQuote=true;}
   else cell+=ch;
   if(cell.length>512)fail("CSV cell is too long.");
   continue;
  }
  if(afterQuote && ![",","\n","\r"].includes(ch))fail("Unexpected character after a quoted field.");
  if(ch==='"'){
   if(cell.length || afterQuote || !atRecordStart)fail("Unexpected quote in a CSV cell.");
   inQuote=true;atRecordStart=false;
  }else if(ch===","){pushCell();atRecordStart=true;}
  else if(ch==="\r"||ch==="\n"){
   if(ch==="\r"&&input[i]==="\n")i++;
   pushRow();
  }else {cell+=ch;atRecordStart=false;}
  if(cell.length>512)fail("CSV cell is too long.");
 }
 if(inQuote)fail("Unterminated quoted CSV field.");
 if(row.length||cell!==""||afterQuote)pushRow();
 if(!records.length)fail("CSV is empty.");
 if(records[0].join(",")!==HEADER)fail("Use exact header: "+HEADER);
 const data=records.slice(1);
 if(!data.length)fail("CSV has no data rows.");
 for(const r of data)if(r.length!==LIMITS.maxColumns)fail("Every CSV row must have exactly five columns.");
 return data;
}
function timeValue(s){
 if(!ISOTIME.test(s))fail("Timestamp must be ISO 8601 with an explicit offset.");
 const t=Date.parse(s);
 if(!Number.isFinite(t))fail("Invalid timestamp.");
 return t;
}
function summarize(groups){
 const m={attempts:0,invalidBeforeQuote:0,samples:0,quoted:0,retried:0,settlementReported:0,deliveredWithSettlement:0,quotedNoRetry:0,retryNoSettlement:0,settlementNoDelivery:0,duplicatePaymentRefs:0};
 const refs=new Set();
 for(const g of groups){
  m.attempts++;
  const s=g.stages;
  if(s.has("invalid_before_quote"))m.invalidBeforeQuote++;
  if(s.has("sample"))m.samples++;
  if(s.has("quote"))m.quoted++;
  if(s.has("signed_retry"))m.retried++;
  if(s.has("settled"))m.settlementReported++;
  if(s.has("quote")&&!s.has("signed_retry"))m.quotedNoRetry++;
  if(s.has("signed_retry")&&!s.has("settled"))m.retryNoSettlement++;
  if(s.has("settled")&&!s.has("delivered"))m.settlementNoDelivery++;
  let uniqueReportedPayment=false;
  if(s.has("settled")){
   uniqueReportedPayment=!refs.has(g.ref);
   if(!uniqueReportedPayment)m.duplicatePaymentRefs++;
   else refs.add(g.ref);
  }
  // A reused opaque payment reference is not an additional distinct delivery.
  if(uniqueReportedPayment&&s.has("delivered"))m.deliveredWithSettlement++;
 }
 m.quoteToReportedDeliveryPercent=m.quoted?
  Math.round((m.deliveredWithSettlement/m.quoted)*10000)/100:null;
 return m;
}
/** Throws instead of quietly interpreting malformed or inconsistent merchant logs. */
export function inspectFunnel(csv){
 const rows=parseCsv(csv);
 const groups=new Map();
 let count=0;const resources=new Set();
 for(const [id,resource,event,ref,stamp] of rows){
  count++;
  if(!ID.test(id)||/^0[xX][0-9a-fA-F]{40}$/.test(id))fail("attempt_id must be a synthetic alphanumeric identifier, not a wallet address.");
  if(!RESOURCE.test(resource)||resource.includes("//")||resource.includes(".."))fail("Invalid resource path. Use a nonsecret public route.");
  if(!ALLOWED.has(event))fail("Unrecognized x402 event: "+event.slice(0,30));
  if(ref!==""&&(!REF.test(ref)||/^0[xX][0-9a-fA-F]{40}$/.test(ref)))fail("Use only an opaque synthetic payment reference, not wallet or transaction data.");
  if(["settled","delivered"].includes(event)!==(ref!==""))fail("Only settled/delivered events require payment_ref; other stages must leave it empty.");
  const t=timeValue(stamp);
  resources.add(resource);
  if(resources.size>LIMITS.maxResources)fail("Maximum 25 public resource paths.");
  if(!groups.has(id))groups.set(id,{resource,stages:new Set(),lastOrder:-2,lastTime:-Infinity,ref:null});
  const g=groups.get(id);
  if(g.resource!==resource)fail("One attempt_id cannot span multiple resources.");
  if(g.stages.has(event))fail("Repeated stage in a single attempt; deduplicate at source.");
  if(event==="invalid_before_quote"&&g.stages.size)fail("Invalid-before-quote cannot be combined with another event.");
  if(g.stages.has("invalid_before_quote"))fail("Invalid-before-quote is terminal.");
  if(event==="sample"&&g.stages.size)fail("Sample is a separate free attempt; use a new attempt_id.");
  if(g.stages.has("sample"))fail("Free sample is a separate attempt.");
  if(event==="quote"&&g.stages.size)fail("Quote must be first within a purchase attempt.");
  if(["signed_retry","settled","delivered"].includes(event)&&!g.stages.has("quote"))fail("Quote is required before a paid stage.");
  if(["settled","delivered"].includes(event)&&!g.stages.has("signed_retry"))fail("Signed retry is required before a settlement or delivery claim.");
  if(event==="delivered"&&!g.stages.has("settled"))fail("Claimed settlement is required before claimed delivery.");
  if(ORDER[event]<g.lastOrder)fail("Out-of-order stage.");
  if(t<g.lastTime)fail("Events must be time-ordered within an attempt.");
  if(ref!==""&&g.ref!==null&&g.ref!==ref)fail("A single attempt has inconsistent payment references.");
  if(ref!=="")g.ref=ref;
  g.stages.add(event);g.lastOrder=ORDER[event];g.lastTime=t;
 }
 const attempts=[...groups.values()];
 const byResource=[];
 for(const name of [...resources].sort()){
  const local=attempts.filter(g=>g.resource===name);
  byResource.push({resource:name,...summarize(local)});
 }
 const total=summarize(attempts);
 return {kind:"offline_self_reported_x402_merchant_stage_funnel",
  inputRows:count,uniqueAttemptCount:attempts.length,...total,resources:byResource,
  flags:{emptyPaidDeliveryClaims:total.deliveredWithSettlement===0,duplicatePaymentReferences:total.duplicatePaymentRefs>0,
   possibleUnfinishedPaymentAttempts:total.retryNoSettlement+total.settlementNoDelivery},
  cautions:[
   "All stages and opaque payment references are supplied by the operator's CSV; this is NOT an RPC or facilitator audit.",
   "A quoted 402, signed retry, self-reported settlement or reported delivery is NOT independent proof of a customer purchase or final token transfer.",
   "Never paste wallet addresses, live transaction hashes, HTTP Authorization headers, cookies, emails, API keys or identifiable client logs into a website.",
   "Payment budgets, agent identity, external wallet balances and actual willingness to pay cannot be inferred from this file."
  ]};
}
