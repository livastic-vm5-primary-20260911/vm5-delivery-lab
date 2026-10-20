import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {resolve,join,extname} from "node:path";
import {createRequire} from "node:module";

const pagePath="docs/csv-quality/index.html";
const official="https://facilitator.payai.network/discovery/resources";
const exactPayee="0x6b01efA0705E91a7aca54271510bf9e594717f34";
const exactMerchant="https://vm5-openapi-x402.onrender.com/v1/csv-report";

test("buyer can click the ORIGINAL authentic independently indexed PayAI merchant from existing real CSV product page",async()=>{
 const html=await readFile(pagePath,"utf8");
 assert.match(html,/Agents: locate the existing priced endpoint without paying to search/);
 const match=html.match(/href="(https:\/\/facilitator\.payai\.network\/discovery\/resources\?[^"]+)"/);
 assert(match);
 assert.equal((html.match(/href="https:\/\/facilitator\.payai\.network\/discovery\/resources/g)||[]).length,1);
 const url=new URL(match[1].replaceAll("&amp;","&"));
 assert.equal(url.origin,"https://facilitator.payai.network");
 assert.equal(url.pathname,"/discovery/resources");
 assert.equal(url.searchParams.get("payTo"),exactPayee);
 assert.equal(url.searchParams.get("limit"),"100");
 assert.equal([...url.searchParams.keys()].length,2);
 assert(html.includes("one indexed VM5 resource"));
 assert(html.includes("GET /v1/csv-report"));
 assert(html.includes("0.005-USDC"));
 assert(html.includes("5,000-atomic-unit"));
 assert(html.includes("eip155:8453"));
});
test("never implies catalogue entry is a live paid sale, full route coverage or proven settlement",async()=>{
 const html=await readFile(pagePath,"utf8");
 const readme=await readFile("README.md","utf8");
 for(const term of ["not</strong> a new purchase","were <strong>not</strong> indexed","Catalog entries can be cached or stale","fresh unsigned","No private CSVs or funds"]) assert(html.includes(term),term);
 assert(readme.includes(exactMerchant));
 assert(readme.includes("NOT a new customer, sale"));
 assert(readme.includes("The original CSV POST"));
 assert(readme.includes("No new registration, wallet, fee, KYC"));
 assert(html.includes("original canonical Circle USDC token"));
 assert(!/<script\b/i.test(html));
});
test("real Chromium desktop and mobile static product guide renders exact index URL and never fetches PayAI or wallet just on view",async()=>{
 const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
 const {chromium}=require("playwright-core");
 const root=resolve("docs");
 const mime={".html":"text/html;charset=utf-8",".css":"text/css;charset=utf-8",".svg":"image/svg+xml"};
 const server=createServer(async(req,res)=>{
  try{
   const route=new URL(req.url,"http://127.0.0.1").pathname.replace(/^\/+/,"");
   if(route.includes("..")||!mime[extname(route)])throw Error("bad route");
   const raw=await readFile(join(root,route));
   res.writeHead(200,{"content-type":mime[extname(route)]});res.end(raw);
  }catch{res.writeHead(404);res.end("not found");}
 });
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
 try {
  for(const viewport of [{width:1180,height:830},{width:390,height:844}]){
   const context=await browser.newContext({viewport});
   const tab=await context.newPage(),errors=[],external=[];
   tab.on("pageerror",e=>errors.push(e.message));
   tab.on("request",r=>{if(!r.url().startsWith(base)) external.push(r.url())});
   const response=await tab.goto(base+"/csv-quality/index.html",{waitUntil:"networkidle",timeout:13000});
   assert.equal(response.status(),200);
   assert.equal(await tab.locator("#agent-discovery").isVisible(),true);
   const a=tab.locator('#agent-discovery a[href^="https://facilitator.payai.network/"]');
   assert.equal(await a.count(),1);
   const href=await a.getAttribute("href");
   const parsed=new URL(href);
   assert.equal(parsed.searchParams.get("payTo"),exactPayee);
   assert.equal(parsed.searchParams.get("limit"),"100");
   assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
   assert.deepEqual(external,[]);
   assert.deepEqual(errors,[]);
   console.log("VM5_EXISTING_PAYAI_REAL_INDEX_DISCOVERY_QA",viewport.width,"PASS, no signed request, no wallet or PayAI auto fetch");
   await context.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
});
