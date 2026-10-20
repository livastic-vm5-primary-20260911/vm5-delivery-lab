import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync("docs/fiat-stablecoin-audit/index.html","utf8");
const readme=readFileSync("README.md","utf8");
const external="https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/#pay";
const separate=html.slice(html.indexOf('<section id="separate-csv-report"'),html.indexOf('</section>',html.indexOf('<section id="separate-csv-report"')));

test("one paid, live original seller alternative is clearly labeled as a separate generic service",()=>{
  assert.ok(separate.startsWith('<section id="separate-csv-report"'));
  assert.equal(html.split(external).length-1,1);
  assert.match(separate,/LOW-COST OPTION .* A DIFFERENT PRODUCT/);
  assert.match(separate,/checking generic CSV duplicate rows/);
  assert.match(separate,/0\.005 native Circle USDC on Base per paid POST/);
  assert.match(separate,/does <strong>not<\/strong> reconcile bank batches/);
  assert.ok(separate.indexOf('href="'+external+'"')>0);
  assert.match(separate,/target="_blank" rel="noopener noreferrer"/);
  assert.ok(readme.includes(external));
});

test("site keeps truly browser-local fiat audit with fixed 49 USDC custom seller unchanged",()=>{
  assert.ok(html.indexOf('<section id="tool"') < html.indexOf('<section id="separate-csv-report"'));
  assert.ok(html.indexOf('<section id="separate-csv-report"') < html.indexOf('<section id="adapt"'));
  assert.match(html,/connect-src 'none'/);
  for(const id of ["funding-file","invoices-file","payouts-file","run","sample","download"]){
    assert.ok(html.includes('id="'+id+'"'),"free audit original DOM lost "+id);
  }
  assert.match(html,/49 <small>USDC indicative<\/small>/);
  assert.match(html,/49 USDC FIXED marketplace offer/);
  assert.match(html,/Discuss scope before a purchase/);
  assert.match(html,/ZERO actual purchases to date/);
});

test("buyer cannot mistake redirect for local-only service or invisible payment",()=>{
  assert.match(separate,/different origin, buyer-initiated|the separate checkout/i);
  assert.match(separate,/explicitly accepts the privacy checkbox/);
  assert.match(separate,/independently authorizes a wallet signature/);
  assert.match(separate,/Unpaid public synthetic quote checks do not charge or connect any wallet/);
  assert.match(separate,/No paying human client or subscription is claimed/);
  assert.match(separate,/do not retry a previously signed charge/);
  assert.doesNotMatch(separate,/<script|<iframe|onload=|onclick=/i);
  assert.doesNotMatch(separate,/guaranteed settlement|instant reconciled payouts/i);
});
