import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const site=readFileSync("docs/fiat-stablecoin-audit/index.html","utf8");
const readme=readFileSync("README.md","utf8");
const form="https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform";
const fixed="https://clawlancer.ai/marketplace/b0b13a43-a307-478c-b62e-22d880cccec6";
const section=site.slice(site.indexOf('<section id="adapt"'),site.indexOf('</section>',site.indexOf('<section id="adapt"')));
test("real anonymous no-payment inquiry is primary and BEFORE uncertain thirdparty checkout",()=>{
  assert.equal(section.split(form).length-1,1);
  assert.equal(section.split(fixed).length-1,1);
  assert.ok(section.indexOf(form)<section.indexOf(fixed));
  assert.match(section,new RegExp('class="primary" href="'+form.replaceAll('/','\\/')+'"'));
  assert.match(section,new RegExp('class="secondary" href="'+fixed.replaceAll('/','\\/')+'"'));
});
test("legitimate limited checkout uncertainty is disclosed; no fake universal outage or purchase",()=>{
  assert.match(section,/anonymous headless browser check/);
  assert.match(section,/public detail page did finish loading/);
  assert.match(section,/confusingly labeled it Open for claims \/ Bounty Amount/);
  assert.match(section,/not a Buy or Purchase button/);
  assert.match(section,/signed-out HUMAN click-to-buy flow is unverified/);
  assert.match(section,/https:\/\/clawlancer\.ai\/api-docs/);
  assert.match(section,/ZERO actual purchases to date/);
  assert.match(section,/NOT checkout/);
  assert.match(section,/buyer contract or USDC received/);
  assert.ok(!/guaranteed buyers|customers cannot purchase|escrow funded/i.test(section));
});
test("intake requires only no-secret schema and concrete exception, not live invoices",()=>{
  assert.match(section,/nonconfidential columns/);
  assert.match(section,/which mismatch costs time/);
  assert.match(section,/Completely fictional sample rows only/);
  assert.match(section,/no-obligation inquiry/);
  assert.match(section,/No payment or wallet connection needed to ask/);
  assert.match(section,/acceptance/);
  assert.match(section,/refunds/);
});
test("existing free no-network browser checker and paid 49 offer remain intact",()=>{
  assert.match(site,/connect-src 'none'/);
  assert.match(site,/id="funding-file"/);
  assert.match(site,/id="invoices-file"/);
  assert.match(site,/id="payouts-file"/);
  assert.match(readme,/Buyer accessibility check 2026-10-21/);
  assert.match(section,/49 USDC/);
  assert.doesNotMatch(section,/<script|onload=|onclick=/);
});
