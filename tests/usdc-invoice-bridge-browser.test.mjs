import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {join,extname,resolve} from "node:path";
import {createRequire} from "node:module";
const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
const {chromium}=require("playwright-core");
const root=resolve("docs");
const types={".html":"text/html;charset=utf-8",".mjs":"application/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".svg":"image/svg+xml"};
async function web(){
 const server=createServer(async(req,res)=>{
  try{let p=new URL(req.url,"http://127.0.0.1").pathname;if(p==="/")p="/index.html";
   if(p.includes("..")||!Object.hasOwn(types,extname(p)))throw Error("invalid file");
   const raw=await readFile(join(root,p));
   res.writeHead(200,{"Content-Type":types[extname(p)],"Cache-Control":"no-store"});res.end(raw);
  }catch{res.writeHead(404);res.end("not found");}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 return {url:"http://127.0.0.1:"+server.address().port+"/usdc-invoice-bridge/",server};
}
test("real local browser desktop/mobile synthetic invoice pairing; no internet or wallet use",async()=>{
 const w=await web();
 const b=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
 try{
  for(const viewport of [{width:1180,height:900},{width:390,height:844}]){
   const context=await b.newContext({viewport,acceptDownloads:true});
   const page=await context.newPage();
   const errors=[],network=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("request",r=>{if(!r.url().startsWith("http://127.0.0.1:")&&!r.url().startsWith("data:")&&!r.url().startsWith("blob:"))network.push(r.url())});
   const res=await page.goto(w.url+"index.html",{waitUntil:"networkidle",timeout:13000});
   assert.equal(res.status(),200);
   assert.equal(await page.locator("#report").isHidden(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.locator("#compare").click();
   assert.equal(await page.locator("#report").isVisible(),true);
   const summary=await page.locator("#summary").innerText();
   assert.match(summary,/Invoices 4/);
   assert.match(summary,/exact 1/);
   assert.match(summary,/partial 1/);
   assert.equal(await page.locator("#rows tr").count(),4);
   assert.match(await page.locator("#manual").innerText(),/shared_address_ambiguous/);
   const downloadPromise=page.waitForEvent("download",{timeout:8000});
   await page.locator("#export").click();
   const download=await downloadPromise;
   assert.equal(download.suggestedFilename(),"reported-invoice-candidate-statuses.csv");
   const reviewPromise=page.waitForEvent("download",{timeout:8000});
   await page.locator("#evidence-export").click();
   const review=await reviewPromise;
   assert.equal(review.suggestedFilename(),"unverified-usdc-event-review-index.csv");
   assert.match(await page.locator("#status").innerText(),/UNVERIFIED CSV input/);

   assert.deepEqual(errors,[]);
   assert.deepEqual(network,[]);
   console.log("INVOICE_BROWSER_LOCAL_ONLY_PASS",JSON.stringify({width:viewport.width,invoices:4,reportedExact:1,partial:1,manualReusedPayee:true,realUploads:0,realWalletCalls:0,pageJSExceptions:0}));
   const rows=page.locator("#invoices");
   await rows.fill("invoice_id,recipient,amount_usdc,chain,token\n=1+1,0x1111111111111111111111111111111111111111,1,eip155:8453,0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913");
   await page.locator("#compare").click();
   assert.match(await page.locator("#status").innerText(),/Invoice IDs must use/);
   assert.equal(await page.locator("#report").isHidden(),true);
   await page.close();await context.close();
  }
 }finally{await b.close();await new Promise(resolve=>w.server.close(resolve));}
});
