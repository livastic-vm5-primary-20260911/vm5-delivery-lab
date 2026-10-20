import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {resolve,join,extname} from "node:path";
import {createRequire} from "node:module";

const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
const {chromium}=require("playwright-core");
const root=resolve("docs");
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
const form="https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform";

test("desktop/mobile truly show 49 USDC optional buyer EMAIL inquiry after FREE form and before agent-only seller, no auto mail",async()=>{
 const server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,"http://127.0.0.1").pathname.replace(/^\/+/,"");
   if(path.includes("..")||!mime[extname(path)])throw Error("not approved");
   const bytes=await readFile(join(root,path));
   res.writeHead(200,{"content-type":mime[extname(path)]});res.end(bytes);
  }catch{res.writeHead(404);res.end("not found")}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 const b=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
 try{
  for(const viewport of [{width:1180,height:830},{width:390,height:844}]){
   const ctx=await b.newContext({viewport});
   const p=await ctx.newPage(),errors=[],external=[];
   p.on("pageerror",e=>errors.push(e.message));
   p.on("request",r=>{if(!r.url().startsWith(base))external.push(r.url())});
   const res=await p.goto(base+"/fiat-stablecoin-audit/index.html",{waitUntil:"networkidle",timeout:13500});
   assert.equal(res.status(),200);
   const actions=await p.locator("#adapt a[href]").evaluateAll(nodes=>nodes.map(n=>({
    text:n.textContent.trim(),url:n.getAttribute("href"),href:n.href,visible:!!n.getClientRects().length
   })));
   const first=actions.findIndex(x=>x.href===form);
   const second=actions.findIndex(x=>x.url.startsWith("mailto:"));
   const third=actions.findIndex(x=>x.href.includes("clawlancer.ai/marketplace/"));
   assert(first>=0&&second>first&&third>second);
   assert(actions[second].visible);
   assert.equal(actions[second].href.split("?")[0],"mailto:onecursor1@gmail.com");
   const mailto=new URL(actions[second].href);
   assert(mailto.searchParams.get("body").includes("Invoice CSV column NAMES only"));
   assert(mailto.searchParams.get("body").includes("NOT placing an order"));
   assert(mailto.searchParams.get("subject").includes("49 USDC"));
   assert(await p.locator("#adapt").innerText().then(s=>s.includes("does not send anything automatically")));
   assert.deepEqual(errors,[]);
   assert.deepEqual(external,[]);
   assert(await p.locator("body").innerText().then(s=>s.includes("Local-only check completed.")));
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
   console.log("ORIGINAL_HUMAN_EMAIL_ONLY_AFTER_REVIEW",viewport.width,"FREE_CSV_EXISTS,FORM_EXISTS,BUYER_OWN_EMAIL_ONLY,CLWL_SECONDARY,NO_NETWORK_MAIL");
   await ctx.close();
  }
 }finally{await b.close();await new Promise(resolve=>server.close(resolve));}
});
