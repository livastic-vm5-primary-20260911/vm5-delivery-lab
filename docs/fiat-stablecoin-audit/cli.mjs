#!/usr/bin/env node
// Original local-only fiat-funded stablecoin payout CSV exception preflight.
// Run with Node.js >= 18; no dependencies and no network or wallet access.
import {stat,readFile} from "node:fs/promises";
import {audit,summaryCsv} from "./audit.mjs";

const MAX_BYTES = 65536;
const HELP = `Offline contractor fiat-to-stablecoin payout CSV exception review
Node.js 18+; no wallet, network, credentials or bank connections.

Usage:
  node cli.mjs --funding BANK.csv --invoices INVOICES.csv --payouts PAYOUTS.csv [--format json|csv] [--strict]
  node cli.mjs --help

Input schemas:
  funding: batch_id,amount,currency,status
  invoices: invoice_id,payout_id,amount,currency
  payouts: payout_id,invoice_id,batch_id,sent_amount,sent_currency,received_amount,received_currency,status

Outputs contain only counts, row numbers and exception codes. An exact record
match is NOT confirmed bank funding, blockchain settlement or accounting advice.
Status values are supplied by the user and are not independently verified.
`;
function usageFail() {
  process.stderr.write("Argument error. Use --help for usage. Never pass secrets.\n");
  process.exitCode=2;
}
function readArgs(args) {
  if (args.length===1 && args[0]==="--help") return {help:true};
  const parsed={};
  const allowed=new Set(["funding","invoices","payouts","format"]);
  for (let j=0;j<args.length;j++) {
    let arg=args[j];
    if (arg==="--strict") {
      if (parsed.strict) throw Error("arguments");
      parsed.strict=true; continue;
    }
    const m=/^--([a-z]+)(?:=(.*))?$/.exec(arg);
    if (!m || !allowed.has(m[1]) || m[1] in parsed) throw Error("arguments");
    const val=m[2]===undefined?args[++j]:m[2];
    if (!val || val.startsWith("--")) throw Error("arguments");
    parsed[m[1]]=val;
  }
  if (!parsed.funding || !parsed.invoices || !parsed.payouts) throw Error("arguments");
  if (parsed.format && !["json","csv"].includes(parsed.format)) throw Error("arguments");
  parsed.format ||= "json";
  return parsed;
}
async function loadSmall(path) {
  const meta=await stat(path);
  if (!meta.isFile() || meta.size > MAX_BYTES || meta.size===0) throw Error("file");
  return readFile(path,"utf8");
}
export async function main(args=process.argv.slice(2)) {
  let config;
  try{config=readArgs(args);} catch {usageFail();return;}
  if(config.help){process.stdout.write(HELP);return;}
  try{
    const [funding,invoices,payouts]=await Promise.all([
      loadSmall(config.funding),loadSmall(config.invoices),loadSmall(config.payouts)
    ]);
    const result=audit({funding,invoices,payouts});
    if(config.format==="csv"){
      process.stdout.write(summaryCsv(result));
    }else{
      const safe={
        tool:"FIAT_STABLECOIN_PAYOUT_AUDIT_LOCAL_ONLY",
        assurance:"OPERATOR_REPORTED_CSV_MATCH_ONLY_NOT_SETTLEMENT_OR_ACCOUNTING_CERTIFICATION",
        sourcesUploaded:0,
        walletOperations:0,
        fundingRows:result.summary.fundingRows,
        invoiceRows:result.summary.invoiceRows,
        payoutRows:result.summary.payoutRows,
        reportedConsistentInvoices:result.summary.reportedConsistent,
        reviewFindings:result.summary.reviewIssues,
        issueCounts:result.issueCounts,
        exceptions:result.issues.map(e=>({source:e.source,row:e.row,code:e.kind})),
        batches:result.batches.map(b=>({fundingRow:b.fundingRow,
          payouts:b.payouts,
          crossCurrency:b.crossCurrency,
          comparison:b.possibleDifference}))
      };
      process.stdout.write(JSON.stringify(safe,null,2)+"\n");
    }
    if(config.strict && result.summary.reviewIssues)process.exitCode=1;
  }catch{
    // Intentionally never reveal row payloads, file paths, credentials or raw I/O errors.
    process.stderr.write("Input error: check CSV headers, quoted cells, size (max 64 KiB), and file permissions. No transfer was attempted.\n");
    process.exitCode=2;
  }
}
if(import.meta.url===new URL("file://"+process.argv[1]).href)await main();
