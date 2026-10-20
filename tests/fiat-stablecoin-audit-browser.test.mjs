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
async function server() {
  const s=createServer(async(req,res)=>{
    try {
      let path=new URL(req.url,"http://127.0.0.1").pathname;
      if(path.includes("..")||!Object.hasOwn(types,extname(path))) throw Error("invalid file");
      const bytes=await readFile(join(root,path));
      res.writeHead(200,{"Content-Type":types[extname(path)],"Cache-Control":"no-store"});res.end(bytes);
    } catch {res.writeHead(404);res.end("not found");}
  });
  await new Promise(ok=>s.listen(0,"127.0.0.1",ok));
  return {s,url:"http://127.0.0.1:"+s.address().port+"/fiat-stablecoin-audit/index.html"};
}
test("real Chrome local-only contractor payout audit on desktop and mobile",async()=>{
  const w=await server();
  const browser=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
  try {
    for (const viewport of [{width:1200,height:920},{width:390,height:844}]) {
      const ctx=await browser.newContext({viewport,acceptDownloads:true});
      const page=await ctx.newPage(),bad=[],jsErrors=[];
      page.on("request",r=>{const u=r.url();if(!u.startsWith("http://127.0.0.1:")&&!u.startsWith("blob:")&&!u.startsWith("data:"))bad.push(u);});
      page.on("pageerror",e=>jsErrors.push(e.message));
      const response=await page.goto(w.url,{waitUntil:"networkidle",timeout:15000});
      assert.equal(response.status(),200);
      assert.equal(await page.locator("#issue-count").innerText(),"6");
      assert.equal(await page.locator("#invoice-count").innerText(),"5");
      assert.equal(await page.locator("#matched-count").innerText(),"1");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),true,"no horizontal page overflow");
      const downloadPromise=page.waitForEvent("download",{timeout:6000});
      await page.locator("#download").click();
      const dl=await downloadPromise;
      assert.equal(dl.suggestedFilename(),"local-payout-exceptions-id-free.csv");
      await page.locator("#invoices").fill("invoice_id,payout_id,amount,currency\n=BAD,P-001,100,USD");
      await page.locator("#run").click();
      assert.ok((await page.locator("#exceptions").innerText()).includes("spreadsheet formula risk"));
      await page.locator("#sample").click();
      assert.equal(await page.locator("#results").isHidden(),true);
      assert.deepEqual(jsErrors,[]);
      assert.deepEqual(bad,[]);
      console.log("FIAT_CRYPTO_AUDIT_BROWSER_OK",JSON.stringify({width:viewport.width,noNetwork:true,syntheticInvoices:5,noOnchainClaims:true}));
      await ctx.close();
    }
  }finally{await browser.close();await new Promise(ok=>w.s.close(ok));}
});
