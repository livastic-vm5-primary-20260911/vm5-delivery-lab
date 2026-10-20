import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=rel=>readFile(new URL(rel,import.meta.url),"utf8");
test("CLI public page has stable canonical and useful descriptive page title",async()=>{
 const h=await source("../docs/usdc-payout-csv/cli.html");
 assert.match(h,/<title>Offline Base USDC Payout CSV CLI/);
 assert.match(h,/rel="canonical" href="https:\/\/livastic-vm5-primary-20260911\.github\.io\/vm5-delivery-lab\/usdc-payout-csv\/cli.html"/);
});
test("public CLI page enforces zero remote execution/network",async()=>{
 const h=await source("../docs/usdc-payout-csv/cli.html");
 assert.match(h,/connect-src 'none'/);
 assert.match(h,/script-src 'none'/);
 assert.ok(!/<script[^>]*src=/.test(h));
 assert.ok(!/<form[\s>]/.test(h));
});
test("public CLI page shows actually executable repo-clone-and-check commands",async()=>{
 const h=await source("../docs/usdc-payout-csv/cli.html");
 for(const line of ["git clone https://github.com/livastic-vm5-primary-20260911/vm5-delivery-lab.git","node tools/base-usdc-payout-csv-cli.mjs --help","--stdin --json --strict"])
   assert.ok(h.includes(line),line);
});
test("CLI page and browser page are explicitly linked as free but distinct",async()=>{
 const cli=await source("../docs/usdc-payout-csv/cli.html");
 const ui=await source("../docs/usdc-payout-csv/index.html");
 assert.match(cli,/>Free browser checker</);
 assert.match(ui,/href="cli.html">CLI install guide/);
 assert.match(cli,/isAccessibleForFree":true/);
 assert.match(cli,/"price":"0"/);
});
test("advertised paid service is separate and not an EVM payout verifier",async()=>{
 const cli=await source("../docs/usdc-payout-csv/cli.html");
 assert.match(cli,/0\.005 native Base Circle USDC per valid call/);
 assert.match(cli,/NOT an EVM payee ownership, crypto transaction or compliance validator/);
 assert.match(cli,/never charges anything or activates the paid service/);
});
test("CLI-page warnings prohibit payout from syntax-only results",async()=>{
 const cli=await source("../docs/usdc-payout-csv/cli.html");
 assert.match(cli,/Never send cryptocurrency based only on a zero-error report/);
 assert.match(cli,/never commit the CSV or generated client information to a public GitHub repository/);
});
test("public catalog and sitemap organically surface CLI without duplicate entries",async()=>{
 const home=await source("../docs/index.html");
 const sm=await source("../docs/sitemap.xml");
 assert.match(home,/href="usdc-payout-csv\/cli.html">Free payout CSV CLI/);
 assert.equal(sm.split("https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-payout-csv/cli.html").length-1,1);
});
test("README documents exit codes, safety, no fake paid billing",async()=>{
 const readme=await source("../README.md");
 assert.match(readme,/Free offline Base USDC payout CSV Node CLI/);
 assert.match(readme,/Exit 0 = no basic data errors, 1 = data errors/);
 assert.match(readme,/needs no npm account, wallet signer or x402 payment/);
});
