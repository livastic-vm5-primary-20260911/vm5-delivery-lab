import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const slug = "livastic-vm5-primary-20260911/x402-checkout-guard-action";
test("site status page offers honest offline CI verification and discloses no sale", () => {
  const s = fs.readFileSync("docs/merchant-status/index.html", "utf8");
  assert.equal(s.split(slug).length - 1, 1);
  assert.match(s, /free x402 Quote Guard GitHub Action/);
  assert.match(s, /zero wallet operations or payments/);
});
test("agent discovery and README use one truthful original source", () => {
  const llms = fs.readFileSync("docs/llms.txt", "utf8");
  const readme = fs.readFileSync("README.md", "utf8");
  assert.equal(llms.split(slug).length - 1, 1);
  assert.ok(readme.includes(slug));
  assert.match(llms, /no payment signing, settlement, buyer installation claim or revenue/);
  assert.match(readme, /No wallet signing, automatic USDC spend, confirmed installations/);
});
