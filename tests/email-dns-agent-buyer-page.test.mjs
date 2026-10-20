import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {resolve,join,extname} from "node:path";
import {createRequire} from "node:module";
const root=resolve("docs");
const pagePath="docs/email-dns-preflight/index.html";
const sample="https://vm5-openapi-x402.onrender.com/v1/email-dns-sample";
const paid="https://vm5-openapi-x402.onrender.com/v1/email-dns-preflight?domain=example.com";
test("one original static DNS page declares real public quote, free fixture and same merchant",async()=>{
 const html=await readFile(pagePath,"utf8");
 assert.match(html,/0\.005\s*<span>USDC<\/span>/);
 assert.match(html,/eip155:8453/);
 assert.match(html,/Native Circle USDC/);
 assert.match(html,/5,000 six-decimal token units/);
 assert(html.includes(sample));assert(html.includes(paid));
 assert(html.includes("https://vm5-openapi-x402.onrender.com/openapi.json"));
 assert(html.includes("curl -i --max-time 35"));
 assert(html.includes("buyer wallet"));
});
test("claims separate published DNS configuration from unverified real inbox delivery",async()=>{
 const html=await readFile(pagePath,"utf8");
 const plain=html.replace(/<[^>]*>/g," ").replace(/\s+/g," ");
 for(const term of ["not a promise that any email will arrive","A listed MX does","Multiple SPF policies","p=none","mailbox existence","DKIM selector validation","No buyer payment","HTTP 402","not a working human checkout","0 verified at publication"])
  assert(plain.toLowerCase().includes(term.toLowerCase()),"Expected honest caveat "+term);
 assert(!/guaranteed delivery|already paid by.*buyer|send your recovery phrase/i.test(html));
});
test("new page has restrictive static content policy and zero wallet or tracking code",async()=>{
 const html=await readFile(pagePath,"utf8");
 assert.match(html,/script-src 'none'; connect-src 'none'/);
 assert.match(html,/style-src 'self'/);
 assert(!/<script\b/i.test(html));assert(!/<form\b/i.test(html));assert(!/<input\b/i.test(html));
 assert(!/ga\(|gtag\(|posthog|mixpanel|plausible/i.test(html));
 assert.match(html,/does not require giving us a buyer's private key or seed phrase/);
});
test("homepage, sitemap, source docs all link a single honest paid product",async()=>{
 const [home,sitemap,readme]=await Promise.all(["docs/index.html","docs/sitemap.xml","README.md"].map(x=>readFile(x,"utf8")));
 assert(home.includes('href="email-dns-preflight/"'));
 assert(home.includes("0.005 native Circle Base USDC per paid call"));
 assert(home.includes("no promise of actual deliverability"));
 assert.match(sitemap,/<loc>https:\/\/livastic-vm5-primary-20260911\.github\.io\/vm5-delivery-lab\/email-dns-preflight\/<\/loc>/);
 assert(readme.includes("0.005 native Circle Base USDC"));
 assert(readme.includes("Zero independently confirmed paying buyers"));
});
test("sample is explicitly fixture only; no chain/user/payment fabricated",async()=>{
 const page=await readFile(pagePath,"utf8");
 assert(page.includes('"FIXTURE_ONLY_NOT_LIVE_DNS"'));
 assert(page.includes("fictional"));assert(page.includes("No signup or wallet"));assert(page.includes("0 verified at publication"));
});
test("real local headless browser desktop+mobile renders DNS buyer path, no third-party requests",async()=>{
 const require=createRequire("/srv/multi-vm-agent/workspace/make_money/work/lastone-mobile-playgama-pilot-20261019/package.json");
 const {chromium}=require("playwright-core");
 const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
 const server=createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,"http://127.0.0.1").pathname;
   const relative=pathname.replace(/^\/+/,"");
   if(!relative||relative.includes("..")||!types[extname(relative)])throw Error("not approved static");
   const raw=await readFile(join(root,relative));
   res.writeHead(200,{"content-type":types[extname(relative)]});res.end(raw);
  }catch{res.writeHead(404);res.end("not found")}
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const host="http://127.0.0.1:"+server.address().port;
 const b=await chromium.launch({headless:true,executablePath:"/opt/google/chrome/chrome",args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]});
 try{
  for(const vp of [{width:1180,height:850},{width:390,height:844}]){
   const context=await b.newContext({viewport:vp});
   const tab=await context.newPage(),jsErrors=[],external=[];
   tab.on("pageerror",e=>jsErrors.push(e.message));
   tab.on("request",r=>{if(!r.url().startsWith(host))external.push(r.url())});
   const response=await tab.goto(host+"/email-dns-preflight/index.html",{waitUntil:"networkidle",timeout:12000});
   assert.equal(response.status(),200);
   assert.match(await tab.locator("h1").innerText(),/check its DNS/);
   assert.match(await tab.locator(".price-card").innerText(),/0\.005 USDC/);
   assert.equal(await tab.getByRole("link",{name:/View free invented JSON sample/}).count(),1);
   assert.equal(await tab.getByRole("link",{name:/Inspect unsigned 402 API quote/}).count(),1);
   assert.equal(await tab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   assert.deepEqual(jsErrors,[]);assert.deepEqual(external,[]);
   await context.close();
   console.log("DNS_BUYER_PAGE_LOCAL_QA",vp.width,"PASS, human wallet calls=0");
  }
 }finally{await b.close();await new Promise(resolve=>server.close(resolve))}
});
