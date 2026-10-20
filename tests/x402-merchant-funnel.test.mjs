import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {inspectFunnel,parseCsv,EXAMPLE,HEADER,LIMITS} from "../docs/x402-merchant-funnel/engine.mjs";
const head=HEADER+"\n";
const T="2026-10-20T10:00:00Z";
function row(id,event,ref="",resource="/v1/report",ts=T){return [id,resource,event,ref,ts].join(",");}
const fake=(...items)=>head+items.join("\n");
test("invented x402 event example has exact declared sample funnel",()=>{
 const result=inspectFunnel(EXAMPLE);
 assert.equal(result.attempts,5);assert.equal(result.quoted,4);
 assert.equal(result.retried,3);assert.equal(result.settlementReported,2);
 assert.equal(result.deliveredWithSettlement,1);
 assert.equal(result.invalidBeforeQuote,1);
 assert.equal(result.quotedNoRetry,1);
 assert.equal(result.retryNoSettlement,1);
 assert.equal(result.settlementNoDelivery,1);
 assert.equal(result.duplicatePaymentRefs,0);
 assert.equal(result.quoteToReportedDeliveryPercent,25);
 assert.equal(result.inputRows,11);
 assert.deepEqual(result.resources.map(x=>x.resource),["/v1/report"]);
});
test("quoted RFC fields, CRLF, BOM and escaped quotes parse safely",()=>{
 const rows=parseCsv("\uFEFF"+HEADER+"\r\n"+"\"att_1\",\"/v1/test\",quote,,2026-10-20T10:00:00Z\r\n");
 assert.equal(rows[0][0],"att_1");
 assert.equal(rows[0][1],"/v1/test");
 const r=parseCsv(HEADER+"\n"+'"at""t",/v1/test,quote,,'+T);
 assert.equal(r[0][0],'at"t');
 assert.throws(()=>inspectFunnel(HEADER+"\n"+'"at""t",/v1/test,quote,,'+T),/attempt_id/);
});
test("schema, lengths, row count and NUL enforce bounded local-only input",()=>{
 assert.throws(()=>parseCsv(""),/empty/);
 assert.throws(()=>parseCsv("hello\n"),/exact header/);
 assert.throws(()=>parseCsv(HEADER),/no data rows/);
 assert.throws(()=>parseCsv(HEADER+"\n"+row("a","quote")+",extra"),/Too many CSV columns/);
 assert.throws(()=>parseCsv(HEADER+"\n"+'a,/v1/test,"quote'),/Unterminated/);
 assert.throws(()=>parseCsv(HEADER+"\n"+row("a","quote")+"\0"),/NUL/);
 assert.throws(()=>parseCsv("a".repeat(LIMITS.maxUtf8Bytes+1)),/64 KiB/);
 assert.throws(()=>parseCsv(head+Array.from({length:501},(_,i)=>row("a"+i,"quote")).join("\n")),/500 data rows/);
});
test("valid paid stages must follow quote, signed retry and claimed settlement",()=>{
 for(const stage of ["signed_retry","settled","delivered"]){
  assert.throws(()=>inspectFunnel(fake(row("x",stage,stage==="settled"||stage==="delivered"?"r1":""))),/Quote is required/);
 }
 assert.throws(()=>inspectFunnel(fake(row("a","quote"),row("a","settled","p1"))),/Signed retry/);
 assert.throws(()=>inspectFunnel(fake(row("a","quote"),row("a","signed_retry"),row("a","delivered","p1"))),/settlement is required/);
});
test("rejects unsupported, unknown and partial stage labels",()=>{
 assert.throws(()=>inspectFunnel(fake(row("x","paid"))),/Unrecognized/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote"),row("x","quote"))),/Repeated stage/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote","secret"))),/Only settled/);
 assert.throws(()=>inspectFunnel(fake(row("x","settled"))),/Only settled/);
});
test("parse fails closed on bad attempt and wallet-like resource or opaque reference",()=>{
 assert.throws(()=>inspectFunnel(fake(row("a@b.com","quote"))),/attempt_id/);
 assert.throws(()=>inspectFunnel(fake(row("0x"+"a".repeat(40),"quote"))),/attempt_id/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote"),row("x","signed_retry"),row("x","settled","0x"+"b".repeat(40)))),/opaque synthetic payment reference/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote","","https://example.com/report"))),/Invalid resource/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote","","/../../secret"))),/Invalid resource/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote","","//admin"))),/Invalid resource/);
 const paid=fake(row("x","quote"),row("x","signed_retry"),row("x","settled","0x"+"a".repeat(64)));
 assert.throws(()=>inspectFunnel(paid),/opaque synthetic payment reference/);
});
test("one request cannot span resource paths, and event ID is a stable local key",()=>{
 assert.throws(()=>inspectFunnel(fake(row("a","quote","","/v1/one"),row("a","signed_retry","","/v1/two"))),/multiple resources/);
});
test("an incomplete quote is NOT a paid delivery",()=>{
 const r=inspectFunnel(fake(row("one","quote")));
 assert.equal(r.quoted,1);assert.equal(r.deliveredWithSettlement,0);
 assert.equal(r.quoteToReportedDeliveryPercent,0);
 assert.equal(r.flags.emptyPaidDeliveryClaims,true);
});
test("free samples and free malformed inputs are separate nonpaying attempts",()=>{
 const r=inspectFunnel(fake(row("preview","sample"),row("bad","invalid_before_quote"),row("quoted","quote")));
 assert.equal(r.samples,1);assert.equal(r.invalidBeforeQuote,1);
 assert.equal(r.quoted,1);assert.equal(r.deliveredWithSettlement,0);
});
test("same attempt cannot combine sample and quote, or invalid input and paid stages",()=>{
 assert.throws(()=>inspectFunnel(fake(row("x","sample"),row("x","quote"))),/Free sample/);
 assert.throws(()=>inspectFunnel(fake(row("x","invalid_before_quote"),row("x","quote"))),/terminal/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote"),row("x","invalid_before_quote"))),/cannot be combined/);
});
test("timestamp must be a validated offset-aware instant and stages cannot reverse",()=>{
 assert.throws(()=>inspectFunnel(fake(row("x","quote","","/v1/report","not-a-time"))),/ISO 8601/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote","","/v1/report","2026-10-20T25:00:00Z"))),/Invalid timestamp/);
 assert.throws(()=>inspectFunnel(fake(row("x","quote","","/v1/report","2026-10-20T10:00:02Z"),
 row("x","signed_retry","","/v1/report","2026-10-20T10:00:01Z"))),/time-ordered/);
});
test("settlement and delivery must share a single opaque reference",()=>{
 const r=inspectFunnel(fake(row("a","quote"),row("a","signed_retry"),row("a","settled","reference1"),row("a","delivered","reference1")));
 assert.equal(r.deliveredWithSettlement,1);
 assert.throws(()=>inspectFunnel(fake(row("a","quote"),row("a","signed_retry"),row("a","settled","pay_A"),row("a","delivered","pay_B"))),/inconsistent payment references/);
});
test("two claims using same payment reference cannot count as two verified purchases",()=>{
 const r=inspectFunnel(fake(
  row("a","quote"),row("a","signed_retry"),row("a","settled","pay1"),row("a","delivered","pay1"),
  row("b","quote"),row("b","signed_retry"),row("b","settled","pay1"),row("b","delivered","pay1")
 ));
 assert.equal(r.duplicatePaymentRefs,1);
 assert.equal(r.flags.duplicatePaymentReferences,true);
 assert.ok(r.deliveredWithSettlement<=1,"Duplicate payment reference may not double-count delivered outcomes");
});
test("multiple distinct public paths have disjoint per-resource stage counters",()=>{
 const r=inspectFunnel(fake(
  row("one","quote","","/v1/one"),row("two","quote","","/v1/two")
 ));
 assert.equal(r.resources.length,2);assert.equal(r.resources[0].quoted,1);assert.equal(r.resources[1].quoted,1);
 assert.throws(()=>inspectFunnel(fake(...Array.from({length:26},(_,i)=>row("x"+i,"quote","","/v1/r"+i)))),/Maximum 25/);
});
test("downloadable aggregate JSON does not leak input IDs, synthetic payment refs or timestamps",()=>{
 const r=inspectFunnel(fake(row("seller_PRIVATE_ID","quote"),row("seller_PRIVATE_ID","signed_retry"),
  row("seller_PRIVATE_ID","settled","ref_SECRET123"),row("seller_PRIVATE_ID","delivered","ref_SECRET123")));
 const output=JSON.stringify(r);
 assert.doesNotMatch(output,/seller_PRIVATE_ID|ref_SECRET123|2026-10-20/);
 assert.match(output,/offline_self_reported_x402/);
 assert.equal(r.cautions.length,4);
});
test("static page has strict CSP and no credential/wallet or data-upload network sinks",async()=>{
 const root=new URL("../docs/x402-merchant-funnel/",import.meta.url);
 const html=await readFile(new URL("index.html",root),"utf8");
 const app=await readFile(new URL("app.mjs",root),"utf8");
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/no wallet/);
 assert.match(html,/49 native Circle Base USDC/);
 assert.match(html,/zero independent paid customers/);
 assert.match(html,/same one human economic owner/);
 assert.doesNotMatch(html,/<script[^>]*src="https:/i);
 assert.doesNotMatch(app,/\bfetch\s*\(|XMLHttpRequest|ethereum\.request|localStorage|sendBeacon|eth_sendTransaction/);
 assert.match(app,/textContent/);
 assert.match(app,/Blob/);
});
