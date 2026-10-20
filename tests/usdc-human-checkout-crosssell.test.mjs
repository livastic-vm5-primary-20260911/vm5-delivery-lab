import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=rel=>readFile(new URL(rel,import.meta.url),"utf8");
const buyerUrl="https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/#pay";

test("Free payout list page links EXACT existing original same-owner optional human CSV checkout",async()=>{
  const s=await read("../docs/usdc-payout-csv/index.html");
  assert.equal(s.split('href="'+buyerUrl+'"').length-1,1);
  assert.match(s,/Optional human checkout · 0\.005 Base USDC/);
});
test("Existing paid general CSV buyer guide also links same human checkout exactly once",async()=>{
  const s=await read("../docs/csv-quality/index.html");
  assert.equal(s.split('href="'+buyerUrl+'"').length-1,1);
  assert.match(s,/Optional 0\.005 USDC browser checkout/);
});
test("Free payout list checker remains physically local with non-network CSP",async()=>{
  const s=await read("../docs/usdc-payout-csv/index.html");
  assert.match(s,/connect-src 'none'/);
  assert.match(s,/script-src 'self'/);
  assert.match(s,/free local payout-list checker never sends your CSV anywhere/);
  assert.ok(!/ethereum\.request|eth_sendTransaction|eth_signTypedData|signTransaction|window\.ethereum/.test(s));
});
test("Distinct general CSV paid checkout never falsely upgrades local payout verifier",async()=>{
  const s=await read("../docs/usdc-payout-csv/index.html");
  assert.match(s,/general CSV structure only/);
  assert.match(s,/does not validate recipients or execute payouts/);
  assert.match(s,/Different product and privacy flow/);
  const paid=await read("../docs/csv-quality/index.html");
  assert.match(paid,/not a spreadsheet preview or an address\/payout verification service/);
});
test("Human checkout has specific opt-in, nonconfidential data and no signed retry advice",async()=>{
  const s=await read("../docs/usdc-payout-csv/index.html");
  const paid=await read("../docs/csv-quality/index.html");
  for(const x of [s,paid]){
    assert.match(x,/consent/i);
    assert.match(x,/nonconfidential/);
    assert.match(x,/retry/i);
  }
  assert.match(paid,/synthetic data/);
});
test("Existing fixed payment price retained and no subscription/deposit implied",async()=>{
  const free=await read("../docs/usdc-payout-csv/index.html");
  const paid=await read("../docs/csv-quality/index.html");
  assert.match(free,/0\.005 USDC \/ valid API call/);
  assert.match(paid,/0\.005 USDC per paid call/);
  assert.ok(!/unlimited credit|guaranteed payout|investment yield/i.test(free+paid));
});
test("Source-level no hidden wallet signer or external request in free local JS",async()=>{
  const app=await read("../docs/usdc-payout-csv/app.mjs");
  const chk=await read("../docs/usdc-payout-csv/checker.mjs");
  for(const s of [app,chk]){
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|signTransaction|eth_sendTransaction|ethereum\.request/.test(s));
  }
});
