import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {resolve,join,extname} from "node:path";
import {createRequire} from "node:module";

const main="docs/index.html";
const src="https://github.com/pursekeeper/api/pull/94";
const properVM1="https://livastic-vm1-primary.github.io/case-studies/pursekeeper-nano-lock-bounty-5xno.html";
const realInquiry="https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform";

test("one public main seller page correctly attributes independently merged and rewarded code to SAME owner's VM1, not VM5 sale",async()=>{
 const html=await readFile(main,"utf8");
 const section=html.split('<aside class="real-sponsor-proof"')[1]?.split("</aside>")[0];
 assert(section);
 assert.equal((html.match(/class="real-sponsor-proof"/g)||[]).length,1);
 assert(section.includes(src));
 assert(section.includes(properVM1));
 assert(section.includes(realInquiry));
 assert(section.includes('PaperPilot (VM1)'));
 assert(section.includes('same one human economic owner'));
 assert(section.includes('not</strong> a claimed VM5 client'));
 assert(section.includes('5 XNO mainnet reward send'));
 assert(section.includes('spendable balance was 0 XNO'));
 assert(section.includes('187 Node tests (182 passed, 5 environment skips, 0 failed)'));
 assert(section.includes('not</strong> a claimed VM5 client, review, testimonial or a VM5 product sale'));
 assert(section.includes('not</strong> a claimed VM5 client, review, testimonial or a VM5 product sale'));
 assert(!section.includes('VM5 earned 5 XNO'));
 assert(!section.includes('new Base USDC payment'));
});
test("landing still offers original prices/contact and no fake purchase, duplicate user, or secret handling",async()=>{
 const html=await readFile(main,"utf8");
 const readme=await readFile('README.md','utf8');
 assert(html.indexOf('id="independent-maintainer-proof"') < html.indexOf('id="process"'));
 assert(html.includes('id="marketplace"'));
 assert(html.includes('49.00'));
 assert(html.includes(realInquiry));
 assert(readme.includes('not a VM5 customer'));
 assert(readme.includes('0 XNO'));
 assert(!/<script\b[^>]+src="https?:\/\//i.test(html));
});
test("public-source case study displays with only pre-existing static Google Fonts requests and no crypto/wallet/merchant auto calls on desktop and mobile",async()=>{
 const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
 const {chromium}=require("playwright-core");
 const root=resolve('docs');
 const mime={".html":"text/html;charset=utf-8",".css":"text/css;charset=utf-8",".svg":"image/svg+xml",".mjs":"text/javascript;charset=utf-8"};
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,"http://127.0.0.1").pathname.replace(/^\/+/,"");
   if(path.includes("..") || !mime[extname(path)])throw Error("unsupported");
   const bytes=await readFile(join(root,path));
   res.writeHead(200,{"content-type":mime[extname(path)]});res.end(bytes);
  }catch{res.writeHead(404);res.end("not found")}
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  for(const viewport of [{width:1160,height:900},{width:390,height:844}]){
   const context=await browser.newContext({viewport});
   const tab=await context.newPage(),errors=[],external=[];
   tab.on("pageerror",e=>errors.push(String(e.message)));
   tab.on("request",r=>{if(!r.url().startsWith(base)) external.push(r.url())});
   const response=await tab.goto(base+'/index.html',{waitUntil:'networkidle',timeout:14000});
   assert.equal(response.status(),200);
   const proof=tab.locator('#independent-maintainer-proof');
   assert.equal(await proof.isVisible(),true);
   assert.equal(await proof.locator('a[href="'+src+'"]').count(),1);
   assert.equal(await proof.locator('a[href="'+properVM1+'"]').count(),1);
   assert.equal(await proof.locator('a[href="'+realInquiry+'"]').count(),1);
   const viewportFits=await tab.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
   assert.equal(viewportFits,true,'No horizontal page scroll permitted on mobile or 1160px laptop');
   assert.deepEqual(errors,[]);
   const unexpected=external.filter(u=>!u.startsWith("https://fonts.googleapis.com/") && !u.startsWith("https://fonts.gstatic.com/"));
   assert.deepEqual(unexpected,[]);
   console.log('ACTUAL_VM5_TRUTHFUL_INDEPENDENT_SPONSOR_PROOF',JSON.stringify({viewport:viewport.width,http:200,sameOwnerVM1Attribution:true,outsideMergerLink:true,existingFontRequests:external.length,unexpectedExternalPaymentOrWalletCalls:unexpected.length}));
   await context.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
});
