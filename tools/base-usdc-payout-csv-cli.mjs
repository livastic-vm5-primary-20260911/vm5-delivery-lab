#!/usr/bin/env node
/**
 * Base USDC payout CSV local preview CLI — VM5 Delivery Lab
 * Free, no external network, no wallet/transaction, no confidential data echo.
 * Always non-authoritative; address ownership and payment finality are NOT checked.
 *
 * exit0: no syntax errors; exit1: data errors (or warnings with --strict);
 * exit2: usage/I/O/csv parsing failure.
 */
import {readFile,lstat} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {TextDecoder} from "node:util";
import {LIMITS,evaluatePayoutCsv,SYNTHETIC_SAMPLE} from "../docs/usdc-payout-csv/checker.mjs";

export const HELP=[
"VM5 local Base USDC recipient payout CSV syntax preflight (v1.0.0)",
"",
"USAGE",
"  node tools/base-usdc-payout-csv-cli.mjs --file ./authorized-payouts.csv",
"  cat ./authorized-payouts.csv | node tools/base-usdc-payout-csv-cli.mjs --stdin --json",
"  node tools/base-usdc-payout-csv-cli.mjs --demo",
"  node tools/base-usdc-payout-csv-cli.mjs --help",
"",
"OPTIONS",
"  --file <csv>   Read an explicitly chosen LOCAL UTF-8 file (no upload).",
"  --stdin        Read UTF-8 text from stdin (not from a wallet).",
"  --json         Print machine-readable JSON findings without raw cells.",
"  --strict       Treat warnings as exit 1 too.",
"  --demo         Inspect only bundled synthetic example (intentional errors).",
"  --version      Print version (1.0.0).",
"  -h, --help     Print this help.",
"",
"RESULT STATUS",
"  0  Syntactically valid under selected policy (NOT payout authorization).",
"  1  Input has data errors, or warnings in --strict mode.",
"  2  Invalid CLI arguments, malformed CSV, oversized or unreadable input.",
"",
"PRIVACY / SAFETY",
"  No network code, wallet, token transfer, RPC, key entry, account, telemetry,",
"  or payment. No payee addresses or CSV cells in console or JSON findings.",
"  Max 64 KiB, 500 rows, 8 columns; never feed private keys, seed phrases,",
"  secrets, health or sensitive client records. You MUST independently verify",
"  recipient ownership, EIP-55 checksum, correct Base network / token,",
"  balances, sanctioned addresses, contracts and the actual send simulation.",
"",
"ONLINE FREE UI",
"  https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-payout-csv/",
"",
"SEPARATE OPTIONAL PAID MACHINE CSV STRUCTURE REPORT",
"  https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/csv-quality/",
"  (0.005 Base Circle USDC/call via x402 v2; DOES NOT prove payee ownership).",
""
].join("\n");

function syntaxError(message){
  const error=new Error(message);
  error.name="UsageError";
  return error;
}
export function parseArgs(args){
  const out={mode:null,path:null,format:"text",strict:false,help:false,version:false};
  const flags=new Set();
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(!arg.startsWith("-"))throw syntaxError("Unexpected positional argument.");
    if(arg==="--file"){
      if(out.mode!==null)throw syntaxError("Only one input source is permitted.");
      if(i===args.length-1||args[i+1].startsWith("--"))throw syntaxError("--file requires a file path.");
      out.path=args[++i];out.mode="file";
      continue;
    }
    if(!["--stdin","--demo","--json","--strict","--version","--help","-h"].includes(arg))
      throw syntaxError("Unknown option.");
    if(flags.has(arg))throw syntaxError("Duplicate option.");
    flags.add(arg);
    if(arg==="--stdin"||arg==="--demo"){
      if(out.mode!==null)throw syntaxError("Only one input source is permitted.");
      out.mode=arg.slice(2);
    }else if(arg==="--json")out.format="json";
    else if(arg==="--strict")out.strict=true;
    else if(arg==="--version")out.version=true;
    else out.help=true;
  }
  if(out.help||out.version){
    if(out.mode!==null||out.strict||out.format==="json")throw syntaxError("--help and --version cannot be combined with a review.");
    if(out.help&&out.version)throw syntaxError("Choose help or version, not both.");
    return out;
  }
  if(!out.mode)throw syntaxError("Provide exactly one of --file, --stdin or --demo.");
  return out;
}
export async function loadAuthorizedLocalInput(parsed,{readStdin=readSafeStdin}={}){
  if(parsed.mode==="demo")return SYNTHETIC_SAMPLE;
  if(parsed.mode==="stdin")return readStdin();
  const path=resolve(parsed.path);
  const s=await lstat(path);
  if(!s.isFile()||s.isSymbolicLink())throw Error("Only a regular local CSV file is supported (no links).");
  if(s.size>LIMITS.bytes)throw Error("CSV is larger than the 64 KiB local limit.");
  // Reading a file does not upload data. The data will not be logged.
  const b=await readFile(path);
  if(b.byteLength>LIMITS.bytes)throw Error("CSV exceeds the 64 KiB local limit.");
  return new TextDecoder("utf-8",{fatal:true}).decode(b);
}
export async function readSafeStdin(source=process.stdin){
  let size=0;
  const parts=[];
  for await(const chunk of source){
    const b=typeof chunk==="string"?Buffer.from(chunk,"utf8"):Buffer.from(chunk);
    size+=b.byteLength;
    if(size>LIMITS.bytes)throw Error("stdin CSV exceeds 64 KiB limit.");
    parts.push(b);
  }
  return new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(parts));
}
export function formatHuman(result){
  const headline=result.errorCount>0?"INVALID DATA":result.warningCount>0?"REVIEW WARNINGS":"NO BASIC STRUCTURAL ERRORS FOUND";
  const lines=[
    headline+" — not a payout authorization",
    "Recipients inspected: "+result.inspectedRows,
    "Syntactically valid unique rows: "+result.acceptedSyntaxRows,
    "Errors: "+result.errorCount+", warnings: "+result.warningCount,
    "Partial total of valid rows only: "+result.validRowsPartialTotalUSDC+" USDC (do not send this amount)",
    "Assumed network: "+result.network,
    "Asset: native Circle USDC on Base",
    ""
  ];
  for(const i of result.issues){
    lines.push(i.severity.toUpperCase()+" "+i.code+" — row "+i.row+(i.column?", column "+i.column:""));
    lines.push("  "+i.message);
  }
  if(result.issuesTruncated)lines.push("Additional findings omitted (bounded diagnostic output).");
  lines.push("IMPORTANT: No EIP-55/address ownership, sanctioned-address, balance or on-chain checks. Never sign from this result.");
  return lines.join("\n")+"\n";
}
export async function run(argv=process.argv.slice(2),{out=process.stdout,err=process.stderr,readStdin=readSafeStdin}={}){
  let options;
  try{options=parseArgs(argv);}
  catch(e){
    err.write("Usage error. Run --help for exact options.\n");
    return 2;
  }
  if(options.help){out.write(HELP);return 0;}
  if(options.version){out.write("1.0.0\n");return 0;}
  try{
    const text=await loadAuthorizedLocalInput(options,{readStdin});
    const results=evaluatePayoutCsv(text);
    if(options.format==="json")out.write(JSON.stringify(results,null,2)+"\n");
    else out.write(formatHuman(results));
    return (results.errorCount||(options.strict&&results.warningCount))?1:0;
  }catch(e){
    // Never emit the input, filename, secrets or stack in public CI logs.
    const message=e instanceof Error?e.message:"Unknown input failure.";
    const safe=[
      "CSV is empty.","CSV must be text.","CSV contains unsupported NUL characters.",
      "CSV has more than 8 columns.","CSV has more than 500 recipient rows.",
      "CSV exceeds the 64 KiB local limit.","CSV is larger than the 64 KiB local limit.",
      "stdin CSV exceeds 64 KiB limit.","Only a regular local CSV file is supported (no links).",
      "Unclosed quoted CSV field."
    ];
    const generic=safe.includes(message)?message:"Invalid or unreadable CSV. No contents were logged.";
    err.write("Local preflight failed: "+generic+"\n");
    return 2;
  }
}
if(import.meta.url===pathToFileURL(resolve(process.argv[1]??"/__missing__")).href){
  run().then(code=>{process.exitCode=code;}).catch(()=>{
    process.stderr.write("Local preflight failed (no input content logged).\n");
    process.exitCode=2;
  });
}
