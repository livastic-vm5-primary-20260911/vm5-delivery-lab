import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {join,extname,resolve} from "node:path";
import {createRequire} from "node:module";
const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
const {chromium}=require("playwright-core");
const root=resolve("docs");
const types={".html":"text/html;charset=utf-8",".mjs":"application/javascript;charset=utf-8",".css":"text/css;charset=utf-8"};
async function web(){
 const server=createServer(async(req,res)=>{
  try{
   let p=new URL(req.url,"http://127.0.0.1").pathname;
   if(p.includes("..")||!Object.hasOwn(types,extname(p)))throw Error("path denied");
   const data=await readFile(join(root,p));res.writeHead(200,{"Content-Type":types[extname(p)],"Cache-Control":"no-store"});res.end(data);
  }catch{res.writeHead(404);res.end("not found");}
 });
 await new Promise(done=>server.listen(0,"127.0.0.1",done));
 return {server,url:"http://127.0.0.1:"+server.address().port+"/x402-merchant-funnel/"};
}
test("actual desktop/mobile Chrome flow is offline-only with honest finite stage counts and aggregate download",async()=>{
 const w=await web();
 const browser=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
 try{
  for(const viewport of [{width:1180,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport,acceptDownloads:true});
   const page=await context.newPage();
   const errors=[],external=[];
   page.on("pageerror",err=>errors.push(err.message));
   page.on("request",req=>{
    if(!req.url().startsWith("http://127.0.0.1:")&&!req.url().startsWith("blob:")&&!req.url().startsWith("data:"))external.push(req.url());
   });
   const response=await page.goto(w.url+"index.html",{waitUntil:"networkidle",timeout:13000});
   assert.equal(response.status(),200);
   assert.equal(await page.locator("#results").isHidden(),true);
   await page.locator("#load-example").click();
   const local=await page.locator("#events").inputValue();
   assert.match(local,/a1,\/v1\/report,quote,/);
   await page.locator("#analyze").click();
   assert.equal(await page.locator("#total-attempts").textContent(),"5");
   assert.equal(await page.locator("#quoted").textContent(),"4");
   assert.equal(await page.locator("#retried").textContent(),"3");
   assert.equal(await page.locator("#settled").textContent(),"2");
   assert.equal(await page.locator("#delivered").textContent(),"1");
   assert.equal(await page.locator("#ratio").textContent(),"25.00%");
   assert.equal(await page.locator("#pay-no-delivery").textContent(),"1");
   assert.equal(await page.locator("#reused-ref").textContent(),"0");
   assert.equal(await page.locator("#resource-rows tr").count(),1);
   const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#download").click()]);
   const report=JSON.parse(await readFile(await download.path(),"utf8"));
   assert.equal(report.kind,"offline_self_reported_x402_merchant_stage_funnel");
   assert.equal(report.deliveredWithSettlement,1);
   assert.doesNotMatch(JSON.stringify(report),/pay_a1|2026-10-20T10:00:00Z|a1,/);
   await page.locator("#events").fill("bad,line,here");
   await page.locator("#analyze").click();
   assert.equal(await page.locator("#results").isHidden(),true);
   assert.equal(await page.locator("#download").isDisabled(),true);
   assert.match(await page.locator("#status").textContent(),/No reliable funnel established/);
   assert.deepEqual(errors,[],"no browser JS errors");
   assert.deepEqual(external,[],"no outbound traffic, analytics or wallet");
   const tooWide=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
   assert.equal(tooWide,false,"content should fit viewport");
   await context.close();
  }
 }finally{await browser.close();await new Promise(done=>w.server.close(done));}
});
