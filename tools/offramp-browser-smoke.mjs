/**
 * Real Chromium, no customer data or actual payment. Run with playwright-core:
 * PLAYWRIGHT_CORE_PATH=/absolute/path/to/playwright-core/index.mjs node tools/offramp-browser-smoke.mjs
 * Chrome is used only against a temporary localhost static server. No persistent tab.
 */
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const base=resolve(fileURLToPath(new URL('../docs/',import.meta.url)));
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const errors=[];const external=[];
const server=createServer((req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let file=resolve(base,'.'+path);
  if(!file.startsWith(base+sep)&&file!==base){res.writeHead(403);res.end();return;}
  if(file===base||path.endsWith('/'))file=resolve(file,'index.html');
  const type=MIME[extname(file)];
  if(!type){res.writeHead(404);res.end();return;}
  try{const b=readFileSync(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(b);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  const packageRef=process.env.PLAYWRIGHT_CORE_PATH||'playwright-core';
  const {chromium}=await import(packageRef);
  browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const port=server.address().port;
  for(const width of [390,1280]){
    const ctx=await browser.newContext({viewport:{width,height:820},acceptDownloads:true});
    const page=await ctx.newPage();
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',q=>{if(!q.url().startsWith('http://127.0.0.1:'+port+'/'))external.push(q.url());});
    const response=await page.goto('http://127.0.0.1:'+port+'/usdc-eur-offramp/',{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    await page.locator('#summary').getByText(/3 invoice rows/).waitFor({timeout:5000});
    assert.match(await page.locator('#message').innerText(),/Potential mismatches/);
    assert.ok((await page.locator('#issues tr').count())>=3);
    assert.equal(await page.locator('#download').isDisabled(),false);
    const dl=page.waitForEvent('download');
    await page.locator('#download').click();
    const item=await dl;
    const csv=readFileSync(await item.path(),'utf8');
    assert.ok(csv.startsWith('file,row,code\n'));
    assert.ok(!csv.includes('INV-F')&&!csv.includes('TX-F')&&!csv.includes('FX-F'));
    await page.locator('#bank').fill('conversion_id,net_eur,status,posted_at_utc\nFX-F1,200,reported_posted,2026-10-19T09:00:00Z\nFX-F3,51,reported_posted,2026-10-19T09:00:00Z');
    await page.locator('#compare').click();
    assert.match(await page.locator('#summary').innerText(),/3 invoice rows/);
    assert.equal(await page.locator('#issues').getByText('BANK_EUR_MISMATCH').count(),0);
    await page.locator('#sample').click();
    assert.ok((await page.locator('#issues').getByText('BANK_EUR_MISMATCH').count())>=1);
    await page.locator('#invoices').fill('invoice_id,expected_usdc\n<img src=x onerror=alert(1)>,10');
    await page.locator('#compare').click();
    assert.equal(await page.locator('img').count(),0);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=1,'horizontal overflow: '+width+' +'+overflow);
    console.log(JSON.stringify({viewport:width,issuesAfterSyntheticEdit:await page.locator('#issues tr').count(),external:external.length,consoleErrors:errors.length,reportedOnly:true}));
    await ctx.close();
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(external,[]);
}finally{
  if(browser)await browser.close();
  await new Promise(r=>server.close(r));
}
