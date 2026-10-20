import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,writeFile,symlink,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {Readable} from "node:stream";
import {parseArgs,readSafeStdin,run,HELP} from "../tools/base-usdc-payout-csv-cli.mjs";
const CLI=fileURLToPath(new URL("../tools/base-usdc-payout-csv-cli.mjs",import.meta.url));
const A="0x1111111111111111111111111111111111111111";
const B="0x2222222222222222222222222222222222222222";
const good="address,amount,chain,token\n"+A+",2.500001,Base,USDC\n"+B+",0.3,eip155:8453,USDC\n";
const missingCols="address,amount\n"+A+",1.2";
function exec(args,{input=""}={}){
 const p=spawnSync(process.execPath,[CLI,...args],{input,encoding:"utf8",timeout:8000,maxBuffer:200000});
 assert.equal(p.error,undefined,p.error?.message);
 return p;
}
test("CLI exactly one source option, no unexpected arguments",()=>{
 assert.equal(parseArgs(["--stdin"]).mode,"stdin");
 assert.equal(parseArgs(["--file","p.csv","--json"]).format,"json");
 assert.throws(()=>parseArgs(["--stdin","--file","p.csv"]));
 assert.throws(()=>parseArgs(["p.csv"]));
 assert.throws(()=>parseArgs(["--file"]));
 assert.throws(()=>parseArgs(["--unknown"]));
 assert.throws(()=>parseArgs(["--stdin","--stdin"]));
});
test("--help shows local product and does not attempt any read",()=>{
 const p=exec(["--help"]);
 assert.equal(p.status,0);
 assert.match(p.stdout,/No network code, wallet, token transfer/);
 assert.match(p.stdout,/0\.005 Base Circle USDC\/call/);
});
test("--version returns semantic version with no network",()=>{
 const p=exec(["--version"]);assert.equal(p.status,0);assert.equal(p.stdout,"1.0.0\n");
});
test("--stdin valid pays NO tokens, exit0, exact BigInt partial sum",()=>{
 const p=exec(["--stdin"],{input:good});
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/2\.800001 USDC/);
 assert.match(p.stdout,/not a payout authorization/);
 assert.doesNotMatch(p.stdout, /0x1111111111111111/i);
});
test("--stdin JSON contains no raw recipient values",()=>{
 const p=exec(["--stdin","--json"],{input:good});
 assert.equal(p.status,0,p.stderr);
 const j=JSON.parse(p.stdout);
 assert.equal(j.acceptedSyntaxRows,2);
 assert.equal(j.validRowsPartialTotalUSDC,"2.800001");
 assert.equal(j.clientOnly,true);
 assert.equal(j.transferred,false);
 assert.doesNotMatch(p.stdout,new RegExp(A,"i"));
 assert.doesNotMatch(p.stdout,new RegExp(B,"i"));
});
test("--demo intentionally invalid and exits1, no real funds",()=>{
 const p=exec(["--demo","--json"]);
 assert.equal(p.status,1);
 const j=JSON.parse(p.stdout);
 assert.equal(j.inspectedRows,5);
 assert.equal(j.errorCount,3);
 assert.equal(j.warningCount,1);
 assert.equal(j.validRowsPartialTotalUSDC,"6.7");
});
test("syntax warnings are success by default, failed in --strict",()=>{
 const a=exec(["--stdin"],{input:missingCols});
 const b=exec(["--stdin","--strict"],{input:missingCols});
 assert.equal(a.status,0);
 assert.equal(b.status,1);
 assert.match(b.stdout,/WARNING CHAIN_ASSUMED/);
});
test("malformed input fails closed exit2 without leaking source",()=>{
 const s='address,amount\n'+A+',"PRIVATE-TOKEN-SEED';
 const p=exec(["--stdin"],{input:s});
 assert.equal(p.status,2);
 assert.equal(p.stdout,"");
 assert.doesNotMatch(p.stderr,/PRIVATE-TOKEN-SEED|0x1111111/);
});
test("wrong chain (eip155:1), duplicate wallet and negative amount exit1",()=>{
 const x="address,amount,chain,token\n"+A+",2,Base,USDC\n"+A+",-3,eip155:1,USDC";
 const p=exec(["--stdin"],{input:x});
 assert.equal(p.status,1);
 for(const code of ["DUPLICATE_ADDRESS","INVALID_AMOUNT","WRONG_CHAIN"])assert.match(p.stdout,new RegExp(code));
});
test("input size larger than 64 KiB does not echo any data",()=>{
 const p=exec(["--stdin"],{input:"TOP_SECRET_PASSWORD="+("A".repeat(65550))});
 assert.equal(p.status,2);
 assert.equal(p.stdout,"");
 assert.doesNotMatch(p.stderr,/PASSWORD|A{10}/);
});
test("--file works on user-selected normal local file only",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"vm5-local-usdc-csv-test-"));
 try{
  const filepath=join(dir,"private-synthetic.csv");
  await writeFile(filepath,good,"utf8");
  const p=exec(["--file",filepath,"--json"]);
  assert.equal(p.status,0,p.stderr);
  assert.equal(JSON.parse(p.stdout).validRowsPartialTotalUSDC,"2.800001");
  assert.doesNotMatch(p.stdout,/private-synthetic/);
 }finally{await rm(dir,{force:true,recursive:true});}
});
test("symlink file is refused without leaking target path",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"vm5-local-usdc-csv-link-test-"));
 try{
  const target=join(dir,"sensitive.csv");
  await writeFile(target,good);
  const link=join(dir,"input-link.csv");
  await symlink(target,link);
  const p=exec(["--file",link]);
  assert.equal(p.status,2);
  assert.doesNotMatch(p.stderr,/sensitive.csv/);
 }finally{await rm(dir,{force:true,recursive:true});}
});
test("nonexistent path error never prints local filesystem path",()=>{
 const pathname="/this-was-an-example-of-a-private-credential-location-missing.csv";
 const p=exec(["--file",pathname]);
 assert.equal(p.status,2);
 assert.doesNotMatch(p.stderr,/private-credential|ENOENT|example-of/);
});
test("file over 64 KiB refused before reading into application memory",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"vm5-local-usdc-csv-big-test-"));
 try{
  const path=join(dir,"big.csv");await writeFile(path,"secret-seed=".repeat(10000));
  const p=exec(["--file",path]);
  assert.equal(p.status,2);
  assert.equal(p.stdout,"");
  assert.doesNotMatch(p.stderr,/secret-seed/);
 }finally{await rm(dir,{force:true,recursive:true});}
});
test("readSafeStdin respects bounded input stream",async()=>{
 const x=await readSafeStdin(Readable.from(["x","y",Buffer.from("z")]));
 assert.equal(x,"xyz");
 await assert.rejects(()=>readSafeStdin(Readable.from([Buffer.alloc(65537)])),/64 KiB/);
});
test("help/version combinations with actions fail closed",()=>{
 assert.equal(exec(["--help","--stdin"]).status,2);
 assert.equal(exec(["--version","--json"]).status,2);
});
test("when imported in tests CLI never executes or reads stdio",async()=>{
 let calls=0;
 const out={write(s){calls++;}};
 const err={write(s){calls++;}};
 const code=await run(["--version"],{out,err});
 assert.equal(code,0);assert.equal(calls,1);
});
test("CLI code contains no signing, RPC, HTTP requester, telemetry",async()=>{
 const s=await readFile(CLI,"utf8");
 for(const bad of ["fetch(","http.request(","https.request(","XMLHttpRequest","eth_sendTransaction","signTypedData","sendRawTransaction","analytics.track"])
  assert.equal(s.includes(bad),false,bad);
 assert.match(s,/no payee addresses or CSV cells/i);
});
