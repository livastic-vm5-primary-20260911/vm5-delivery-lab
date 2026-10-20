import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");
const feedback="https://github.com/livastic-vm5-primary-20260911/vm5-delivery-lab/issues/new?template=usdc-payout-csv-feedback.yml";
test("public original free browser checker links ONE matching real GitHub issue template",async()=>{
 const html=await read("../docs/usdc-payout-csv/index.html");
 assert.equal(html.split('href="'+feedback+'"').length-1,1);
 assert.match(html,/Share your feedback or report a bug/);
});
test("offline CLI guide requests feedback, not payment or recipient uploads",async()=>{
 const html=await read("../docs/usdc-payout-csv/cli.html");
 assert.equal(html.split('href="'+feedback+'"').length-1,1);
 assert.match(html,/Feedback is free and never creates a paid order/);
 assert.match(html,/Never paste real recipient addresses/);
});
test("correct human GitHub issue form is present in repository",async()=>{
 const yaml=await read("../.github/ISSUE_TEMPLATE/usdc-payout-csv-feedback.yml");
 assert.match(yaml,/^name: "Feedback: free Base USDC payout CSV checker"/m);
 assert.match(yaml,/id: csv-headers/);
 assert.match(yaml,/id: improvement/);
 assert.match(yaml,/id: paid-intent/);
 assert.match(yaml,/Choosing Yes is NOT an order/);
});
test("GitHub issue UX solicits value signals rather than fake testimonials",async()=>{
 const yaml=await read("../.github/ISSUE_TEMPLATE/usdc-payout-csv-feedback.yml");
 assert.match(yaml,/Which single improvement would create the most value/);
 assert.match(yaml,/Which part did you try/);
 assert.match(yaml,/Which generic CSV column names/);
 assert.match(yaml,/No, the free browser\/CLI is sufficient/);
});
test("Public feedback template prohibits real payee, KYC and secrets disclosure",async()=>{
 const yaml=await read("../.github/ISSUE_TEMPLATE/usdc-payout-csv-feedback.yml");
 assert.match(yaml,/don't include actual wallet addresses, real payroll rows or amounts/);
 assert.match(yaml,/No cryptocurrency payment is required to provide feedback/);
 assert.match(yaml,/not a transaction or support for already-signed payments/);
});
test("Exactly one named feedback issue template, preserving existing scoped-project inquiry",async()=>{
 const project=await read("../.github/ISSUE_TEMPLATE/project-inquiry.yml");
 const feedbackTemplate=await read("../.github/ISSUE_TEMPLATE/usdc-payout-csv-feedback.yml");
 assert.match(project,/Request a scoped software project/);
 assert.match(feedbackTemplate,/Feedback: free Base USDC payout CSV checker/);
 assert.ok(!/DEFAULT_SECRET=|PRIVATE_KEY=|PASSWORD=|seed phrase example: /.test(feedbackTemplate));
});
test("Feedback collection never modifies the zero-network local checker",async()=>{
 const js=await read("../docs/usdc-payout-csv/checker.mjs");
 assert.ok(!/\bfetch\s*\(/.test(js));
 assert.ok(!/sendTransaction|XMLHttpRequest/.test(js));
});
