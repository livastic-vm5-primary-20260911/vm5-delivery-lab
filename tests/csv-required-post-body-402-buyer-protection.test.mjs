import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {resolve,join,extname} from "node:path";
import {createRequire} from "node:module";

const file="docs/csv-quality/index.html";
const externalDoctor="https://x402-doctor.fizzl.eu/";
const officialSpec="https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md";

test("actual VM5 paid POST merchant guide teaches valid invented JSON body requirement before a REAL unpaid HTTP402 quote",async()=>{
 const html=await readFile(file,"utf8");
 const a=html.indexOf('<h3>Unpaid quote: buyer-owned CSV</h3>'), b=html.indexOf('id="required-body-check"');
 assert(a>=0&&b>a);
 assert(html.includes('curl -i -X POST'));
 assert(html.includes('https://vm5-openapi-x402.onrender.com/v1/csv-preflight'));
 assert(html.includes('name,amount\\nalpha,2'));
 assert(html.includes('Content-Type: application/json'));
 assert(html.includes('empty or invalid JSON body correctly fails validation'));
 assert(html.includes('HTTP 400/422'));
 assert(html.includes('unsigned HTTP 402'));
 assert(html.includes('with no token transfer'));
 assert.match(html,/canonical payment challenge resides in the base64/);
 assert(html.includes('PAYMENT-REQUIRED'));
 assert(html.includes('5000'));
 assert(html.includes('eip155:8453'));
});
test("no seller or thirdparty endorsement, unrelated signed calls, billing or private contact is introduced",async()=>{
 const [html,readme]=await Promise.all([readFile(file,"utf8"),readFile("README.md","utf8")]);
 assert(html.includes(officialSpec));
 assert(html.includes(externalDoctor));
 assert(html.includes('without spending USDC'));
 assert(html.includes('outside site receives the values you enter'));
 assert(html.includes('No browser diagnostic or payment request is sent by this page'));
 assert(html.includes('not a customer endorsement of VM5'));
 assert(html.includes('not</strong> a failed x402 v2 protocol check'));
 assert(html.includes('Never resubmit a signed payment after a browser/network timeout'));
 assert(html.includes('paid HTTP 200 delivery'));
 assert(readme.includes('canonical location'));
 assert(readme.includes('overall diagnostic remained WARN'));
 assert(!/<script\b/i.test(html));
 assert(!/onload=|onclick=|onerror=/i.test(html));
});
test("desktop and mobile buyer actually see canonical POST-body case, no auto network to outside Doctor or buyer wallet",async()=>{
 const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
 const {chromium}=require("playwright-core");
 const root=resolve("docs");
 const mime={".html":"text/html;charset=utf-8",".css":"text/css;charset=utf-8",".svg":"image/svg+xml"};
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,"http://127.0.0.1").pathname.replace(/^\/+/,"");
   if(path.includes("..")||!mime[extname(path)])throw Error("not approved");
   const body=await readFile(join(root,path));
   res.writeHead(200,{"content-type":mime[extname(path)]});res.end(body);
  }catch{res.writeHead(404);res.end("not found");}
 });
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
 try{
  for(const viewport of [{width:1180,height:840},{width:390,height:844}]){
   const ctx=await browser.newContext({viewport});
   const p=await ctx.newPage(),errors=[],external=[];
   p.on("pageerror",e=>errors.push(e.message));
   p.on("request",r=>{if(!r.url().startsWith(base))external.push(r.url());});
   const response=await p.goto(base+"/csv-quality/index.html",{waitUntil:"networkidle",timeout:15000});
   assert.equal(response.status(),200);
   assert.equal(await p.locator("#required-body-check").isVisible(),true);
   assert.equal(await p.locator("#required-body-check a[href^='https://x402-doctor.fizzl.eu']").count(),1);
   assert.equal(await p.locator("#required-body-check a[href^='https://github.com/x402-foundation/x402']").count(),1);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
   assert.deepEqual(external,[]);
   assert.deepEqual(errors,[]);
   console.log("REAL_VENDOR_SAFE_X402_POST_BODY_QA",viewport.width,"HTTP200, no external requests, wallet calls, mail or signed payment");
   await ctx.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
});
