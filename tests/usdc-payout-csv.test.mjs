import {test} from "node:test";
import assert from "node:assert/strict";
import {parseCsv,evaluatePayoutCsv as review,formatAtomic,LIMITS,SYNTHETIC_SAMPLE} from "../docs/usdc-payout-csv/checker.mjs";
const A="0x1111111111111111111111111111111111111111";
const B="0x2222222222222222222222222222222222222222";
const C="0xabcdef0123456789abcdef0123456789abcdef01";
function csv(lines){return ["address,amount,chain,token,memo",...lines].join("\n");}
function row(addr,amount="1.50",chain="Base",token="USDC",memo="note"){return [addr,amount,chain,token,memo].join(",");}
function has(r,code){return r.issues.some(i=>i.code===code);}
test("strict parser preserves quoted comma and escaped quote",()=>{
  assert.deepEqual(parseCsv('address,memo\n'+A+',"hello, ""world"""'),[["address","memo"],[A,'hello, "world"']]);
});
test("parser supports BOM, CRLF and quoted newline",()=>{
  const x=parseCsv('\uFEFFaddress,memo\r\n'+A+',"first\r\nsecond"\r\n');
  assert.equal(x.length,2);assert.equal(x[1][1],"first\r\nsecond");
});
test("parser keeps trailing empty cells",()=>assert.equal(parseCsv('a,b,\n1,2,')[1].length,3));
test("reject empty",()=>assert.throws(()=>parseCsv(" \r\n "),/empty/i));
test("reject NUL",()=>assert.throws(()=>parseCsv("x,y\u0000"),/NUL/i));
test("reject quoted-then-garbage",()=>assert.throws(()=>parseCsv('a\n"foo"bar'),/closing/i));
test("reject unclosed quote",()=>assert.throws(()=>parseCsv('a\n"never'),/Unclosed/i));
test("reject quote in bare text",()=>assert.throws(()=>parseCsv('a\nab"cd'),/unquoted/i));
test("reject too many columns",()=>assert.throws(()=>parseCsv("a,b,c,d,e,f,g,h,i"),/8 columns/i));
test("reject excessive size",()=>assert.throws(()=>parseCsv("a".repeat(LIMITS.bytes+1)),/64 KiB/i));
test("reject excessive recipients",()=>assert.throws(()=>parseCsv("a\n"+"x\n".repeat(LIMITS.rows+1)),/500 recipient/i));
test("complete valid two-payee dry run",()=>{
 const r=review(csv([row(A,"0.000001"),row(B,"2.345678")]));
 assert.equal(r.errorCount,0);
 assert.equal(r.acceptedSyntaxRows,2);
 assert.equal(r.validRowsPartialTotalUSDC,"2.345679");
 assert.equal(r.transferred,false);
 assert.equal(r.clientOnly,true);
});
test("exact BigInt decimal avoids float errors",()=>assert.equal(formatAtomic(1000001n),"1.000001"));
test("formatAtomic rejects invalid input",()=>assert.throws(()=>formatAtomic(-1n)));
test("synthetic sample contains errors AND safe valid rows",()=>{
 const r=review(SYNTHETIC_SAMPLE);
 assert.equal(r.inspectedRows,5);
 assert.ok(r.errorCount>=3);
 assert.ok(has(r,"DUPLICATE_ADDRESS"));
 assert.ok(has(r,"WRONG_CHAIN"));
 assert.ok(has(r,"FORMULA_LIKE_CELL"));
});
test("detect invalid EVM address",()=>assert.ok(has(review(csv([row("0x123")])), "INVALID_ADDRESS")));
test("reject 0x000... burn address",()=>assert.ok(has(review(csv([row("0x"+"0".repeat(40))])),"INVALID_ADDRESS")));
test("detect case-insensitive duplicate even with address letter case change",()=>{
 const r=review(csv([row(C,"1"),row(C.toUpperCase().replace("0X","0x"),"2")]));
 assert.ok(has(r,"DUPLICATE_ADDRESS"));
});
test("7 fraction digits rejected",()=>assert.ok(has(review(csv([row(A,"1.0000001")])),"INVALID_AMOUNT")));
test("0 USDC rejected",()=>assert.ok(has(review(csv([row(A,"0.0")])),"INVALID_AMOUNT")));
test("negative amount rejected",()=>assert.ok(has(review(csv([row(A,"-1")])),"INVALID_AMOUNT")));
test("plus amount rejected",()=>assert.ok(has(review(csv([row(A,"+1")])),"INVALID_AMOUNT")));
test("scientific notation rejected",()=>assert.ok(has(review(csv([row(A,"1e9")])),"INVALID_AMOUNT")));
test("non-numeric amount rejected",()=>assert.ok(has(review(csv([row(A,"n/a")])),"INVALID_AMOUNT")));
test("too large row amount rejected",()=>assert.ok(has(review(csv([row(A,"1000000001")])),"INVALID_AMOUNT")));
test("wrong chain rejected",()=>assert.ok(has(review(csv([row(A,"1","eip155:1")])),"WRONG_CHAIN")));
test("Base CAIP chain passes",()=>assert.equal(review(csv([row(A,"1","eip155:8453")])).errorCount,0));
test("wrong token rejected",()=>assert.ok(has(review(csv([row(A,"1","Base","USDT")])),"WRONG_TOKEN")));
test("native Circle Base USDC contract accepted",()=>assert.equal(review(csv([row(A,"1","Base","0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913")])).errorCount,0));
test("unrecognized headers warn, no arbitrary unknown instructions",()=>assert.ok(has(review("address,amount,privateKey\n"+A+",1,secret"),"UNRECOGNIZED_COLUMN")));
test("missing required headers fail closed",()=>assert.ok(has(review("memo\nhello"),"ADDRESS_HEADER_MISSING")));
test("duplicate case-insensitive headers fail",()=>assert.ok(has(review("address,Address,amount\n"+A+","+A+",1"),"HEADER_DUPLICATE_OR_EMPTY")));
test("ragged rows detected and omitted from totals",()=>{
 const r=review("address,amount\n"+A+",1\n"+B);
 assert.ok(has(r,"RAGGED_ROW"));assert.equal(r.acceptedSyntaxRows,1);
});
test("absence of chain and token disclosed",()=>{
 const r=review("address,amount\n"+A+",0.1");
 assert.ok(has(r,"CHAIN_ASSUMED"));assert.ok(has(r,"TOKEN_ASSUMED"));
});
test("formula-like memo flagged, not executed",()=>assert.ok(has(review(csv([row(A,"1","Base","USDC","=HYPERLINK()")])),"FORMULA_LIKE_CELL")));
test("summary contains no addresses, CSV source or private data",()=>{
 const s=JSON.stringify(review(csv([row(C,"17.29","Base","USDC","PRIVATE-BENEFICIARY-NAME")])));
 assert.ok(!s.includes(C));assert.ok(!s.includes("PRIVATE-BENEFICIARY-NAME"));
});
test("no 402 client/server signatures in source",async()=>{
 const fs=await import("node:fs/promises");
 const s=await fs.readFile(new URL("../docs/usdc-payout-csv/checker.mjs",import.meta.url),"utf8");
 assert.ok(!/\bfetch\s*\(/.test(s));assert.ok(!/sendTransaction|signTransaction|wallet\.request|XMLHttpRequest/.test(s));
});
