/**
 * Local-only CSV-to-invoice review. No funds, network, wallet, ledger reads,
 * personal data, accounting certification, or assertions of on-chain finality.
 */
import {parseCsv,formatAtomic} from "../usdc-payout-csv/checker.mjs";
const USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ADDR=/^0x[0-9a-fA-F]{40}$/;
const HASH=/^0x[0-9a-fA-F]{64}$/;
const MONEY=/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,6})?$/;
const INVOICE_ID=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const ALLOWED_CHAIN="eip155:8453";
export const LIMITS=Object.freeze({maxBytes:65536,maxRows:500,maxColumns:8});
const requiredInv=["invoice_id","recipient","amount_usdc","chain","token"];
const requiredPay=["invoice_id","tx_hash","log_index","recipient","amount_usdc","chain","token","status"];
function parseTable(text,need){
 if(typeof text!=="string"||new TextEncoder().encode(text).length>LIMITS.maxBytes)throw Error("Each CSV must be text under 64 KiB.");
 const rows=parseCsv(text); // tested original bounded escaped-quote parser
 if(rows.length<=1)throw Error("CSV must contain a header and at least one row.");
 const header=rows[0].map(c=>c.trim().toLowerCase());
 if(header.some(x=>!x)||new Set(header).size!==header.length||header.length>LIMITS.maxColumns)throw Error("Column headers must be unique, nonempty and at most 8.");
 if(need.some(x=>!header.includes(x)))throw Error("Missing required columns: "+need.filter(x=>!header.includes(x)).join(", "));
 if(rows.length-1>LIMITS.maxRows)throw Error("Only 500 data rows supported.");
 const invalid=header.filter(x=>!need.includes(x));
 if(invalid.length)throw Error("Unexpected columns: "+invalid.join(", ")+". This strict format avoids silently reading unrelated personal data.");
 return rows.slice(1).map((row,i)=>{
  if(row.length!==header.length)throw Error("Irregular column count at CSV row "+(i+2)+".");
  const item={};for(let n=0;n<header.length;n++)item[header[n]]=row[n].trim();
  item.__row=i+2;return item;
 });
}
function validateInfo(row){
 if(!ADDR.test(row.recipient)||/^0x0{40}$/i.test(row.recipient))throw Error("CSV row "+row.__row+": recipient must be a valid non-zero EVM address.");
 if(row.chain!==ALLOWED_CHAIN)throw Error("CSV row "+row.__row+": only Base mainnet eip155:8453 supported.");
 if(row.token.toLowerCase()!==USDC)throw Error("CSV row "+row.__row+": use the canonical Circle Base USDC contract address, not ticker symbols or a bridged token.");
 if(!MONEY.test(row.amount_usdc))throw Error("CSV row "+row.__row+": exact positive USDC decimal with <=6 fractional digits required.");
 const parts=row.amount_usdc.split(".");
 const n=BigInt(parts[0])*1000000n+BigInt((parts[1]||"").padEnd(6,"0"));
 if(n<=0n)throw Error("CSV row "+row.__row+": amount must be positive.");
 return {address:row.recipient.toLowerCase(),amount:n};
}
function safeID(id,allowBlank){
 if(allowBlank && id==="")return "";
 if(!INVOICE_ID.test(id))throw Error("Invoice IDs must use letters, digits, dots, underscores, hyphens and <=64 characters. No customer names or formulas.");
 return id;
}
function normHash(s,row){
 if(!HASH.test(s))throw Error("CSV row "+row+": invalid transaction hash format.");
 return s.toLowerCase();
}
function normLogIndex(s,row){
 if(!/^(?:0|[1-9][0-9]{0,6})$/.test(s))throw Error("CSV row "+row+": invalid log index.");
 return String(Number(s));
}
export const SYNTHETIC=Object.freeze({
 invoices:[
 "invoice_id,recipient,amount_usdc,chain,token",
 "INV-DEMO-A,0x1111111111111111111111111111111111111111,2.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913",
 "INV-DEMO-B,0x2222222222222222222222222222222222222222,1.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913",
 "INV-DEMO-C,0x2222222222222222222222222222222222222222,1.500000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913",
 "INV-DEMO-D,0x3333333333333333333333333333333333333333,0.300000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913"
 ].join("\n"),
 transfers:[
 "invoice_id,tx_hash,log_index,recipient,amount_usdc,chain,token,status",
 "INV-DEMO-A,0x"+ "a".repeat(64)+",1,0x1111111111111111111111111111111111111111,2.000000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,reported_finalized",
 "INV-DEMO-B,0x"+ "b".repeat(64)+",0,0x2222222222222222222222222222222222222222,0.400000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,reported_finalized",
 ",0x"+ "c".repeat(64)+",2,0x2222222222222222222222222222222222222222,1.500000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,reported_finalized",
 "INV-DEMO-D,0x"+ "d".repeat(64)+",0,0x3333333333333333333333333333333333333333,0.300000,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,pending"
 ].join("\n")
});
export function reconcile(invoicesCSV,transfersCSV){
 const inputInvoices=parseTable(invoicesCSV,requiredInv);
 const inputTransfers=parseTable(transfersCSV,requiredPay);
 const invoices=new Map();
 for(const row of inputInvoices){
  const id=safeID(row.invoice_id,false);
  if(invoices.has(id))throw Error("Duplicate invoice ID "+id+": fix invoice source first.");
  const checked=validateInfo(row);
  invoices.set(id,{id,...checked,reportReceived:0n,pendingCount:0,eventCount:0,issues:[]});
 }
 const events=new Map(),transferRows=[];
 for(const row of inputTransfers){
  const id=safeID(row.invoice_id,true);
  const amount=validateInfo(row);
  const hash=normHash(row.tx_hash,row.__row);
  const index=normLogIndex(row.log_index,row.__row);
  if(!["reported_finalized","pending"].includes(row.status))throw Error("CSV row "+row.__row+": status must be reported_finalized or pending, never assumed real chain finality.");
  const key=ALLOWED_CHAIN+":"+hash+":"+index;
  const item={...amount,key,id,status:row.status,row:row.__row};
  if(!events.has(key))events.set(key,[]);
  events.get(key).push(item);
  transferRows.push(item);
 }
 let duplicates=0,misdirected=0,unreferenced=0,unknownInvoice=0;
 const manual=[];
 for(const receipt of transferRows){
  if(events.get(receipt.key).length!==1){duplicates++;continue;}
  if(!receipt.id){
   unreferenced++;
   const c=[...invoices.values()].filter(x=>x.address===receipt.address).map(x=>x.id);
   manual.push({kind:c.length>1?"shared_address_ambiguous":"unreferenced_event",eventKey:receipt.key,candidateInvoiceIds:c.slice(0,8)});
   continue; // NEVER auto-match by recipient/amount alone
  }
  const invoice=invoices.get(receipt.id);
  if(!invoice){unknownInvoice++;manual.push({kind:"unknown_invoice_id",eventKey:receipt.key,candidateInvoiceIds:[]});continue;}
  if(invoice.address!==receipt.address){misdirected++;invoice.issues.push("RECIPIENT_MISMATCH");manual.push({kind:"recipient_mismatch",eventKey:receipt.key,candidateInvoiceIds:[invoice.id]});continue;}
  if(receipt.status!=="reported_finalized"){invoice.pendingCount++;continue;}
  invoice.reportReceived+=receipt.amount;
  invoice.eventCount++;
 }
 const result=[...invoices.values()].map(x=>{
  const status=x.issues.length?"manual_review_required":
    x.reportReceived>x.amount?"reported_overpayment":
    x.reportReceived===x.amount?"reported_exact":
    x.reportReceived>0n?"reported_partial":
    x.pendingCount?"pending_only":"no_allocated_receipt";
  return {invoice_id:x.id,status,expected_usdc:formatAtomic(x.amount),
   reported_finalized_usdc:formatAtomic(x.reportReceived),
   reported_difference_usdc: x.amount>=x.reportReceived ? formatAtomic(x.amount-x.reportReceived) : "-"+formatAtomic(x.reportReceived-x.amount),
   receipt_events:x.eventCount,pending_events:x.pendingCount,issues:[...new Set(x.issues)]};
 });
 const summary={
  invoiceCount:result.length,transferRows:transferRows.length,
  reportedExact:result.filter(x=>x.status==="reported_exact").length,
  reportedPartial:result.filter(x=>x.status==="reported_partial").length,
  needsManualReview:result.filter(x=>x.status==="manual_review_required").length,
  duplicateEventRows:duplicates,unreferencedEvents:unreferenced,wrongRecipientEvents:misdirected,
  unknownInvoiceEvents:unknownInvoice,pendingReported:result.reduce((a,b)=>a+b.pending_events,0),
 };
 const conflicting=new Set([...events.entries()].filter(([,v])=>v.length>1).map(([key])=>key));
 for(const eventKey of conflicting)manual.push({kind:"duplicate_or_conflicting_transfer_event",eventKey,candidateInvoiceIds:[]});
 return {tool:"VM5 free local invoice/USDC event CSV matcher",
  safety:"DATA ARE SELF-REPORTED CSV INPUTS. No RPC, no verified settlement/finality, no wallet, no approval, no accounting/tax opinion. A reported_exact match is NOT proof an invoice was paid.",
  summary,invoices:result,manualReview:manual.slice(0,100),noncustodial:true,networkCalls:0};
}
export function reportCsv(out){
 if(!out||!Array.isArray(out.invoices))throw Error("Run comparison first.");
 const headers=["invoice_id","status","expected_usdc","reported_finalized_usdc","reported_difference_usdc","receipt_events","pending_events"];
 const rows=[headers.join(",")];
 for(const inv of out.invoices){
  const cells=headers.map(k=>String(inv[k]));
  if(!INVOICE_ID.test(cells[0]) || cells.some(v=>/[\r\n,"]/g.test(v)))throw Error("Refusing unsafe export.");
  rows.push(cells.join(","));
 }
 return rows.join("\r\n")+"\r\n";
}
