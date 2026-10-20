#!/usr/bin/env node
// Zero-network, zero-wallet, zero-transaction unsigned x402 v2 PaymentRequired inspector.
// There is no fetch, signing, HTTP request, transaction submission, or secret access.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE_NETWORK = 'eip155:8453';
const BASE_CIRCLE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const VM5_CSV_URL = 'https://vm5-openapi-x402.onrender.com/v1/csv-report';
const VM5_PUBLISHED_PAYTO = '0x6b01efa0705e91a7aca54271510bf9e594717f34';
const EVM_ADDRESS = /^0x[0-9a-f]{40}$/i;
const MAX_STDIN = 65536;
const MAX_BYTES = 32768;

function decimalSixAtomic(raw) {
  const n = BigInt(raw);
  const units = (n / 1000000n).toString();
  const fractional = (n % 1000000n).toString().padStart(6, '0');
  return units + '.' + fractional;
}

export function inspectUnsignedQuote(encoded, options = {}) {
  if (typeof encoded !== 'string') throw Error('Expected public unsigned PAYMENT-REQUIRED base64.');
  const trimmed = encoded.trim();
  if (trimmed.length < 12 || trimmed.length > MAX_STDIN ||
      /[\s:]/.test(trimmed) || !/^[A-Za-z0-9+/_=-]+$/.test(trimmed)) {
    throw Error('Malformed or non-public unsigned PAYMENT-REQUIRED base64.');
  }
  const plain = trimmed.replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/, '');
  if (plain.length % 4 === 1) throw Error('Malformed base64 input.');
  const bytes = Buffer.from(plain, 'base64');
  if (bytes.length < 12 || bytes.length > MAX_BYTES ||
      bytes.toString('base64').replace(/=+$/, '') !== plain) {
    throw Error('Invalid, non-canonical or oversized base64 unsigned quote.');
  }
  let j;
  try {
    j = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw Error('Unsigned quote is not valid UTF-8 JSON.');
  }
  if (!j || typeof j !== 'object' || Array.isArray(j) ||
      j.x402Version !== 2 || !j.resource ||
      typeof j.resource.url !== 'string' ||
      !Array.isArray(j.accepts) || j.accepts.length < 1 || j.accepts.length > 10) {
    throw Error('Expected an x402 v2 PaymentRequired resource and 1-10 accepts entries.');
  }
  let resource;
  try { resource = new URL(j.resource.url); }
  catch { throw Error('Resource URL invalid.'); }
  if (resource.protocol !== 'https:' || resource.username || resource.password ||
      resource.hash || resource.href !== j.resource.url) {
    throw Error('Only canonical HTTPS resource URLs without credentials or fragments may be inspected.');
  }
  if (options.expectedUrl && j.resource.url !== options.expectedUrl) {
    throw Error('Resource URL does not match the explicitly expected endpoint.');
  }
  const offers = j.accepts.map((a, i) => {
    if (!a || typeof a !== 'object' || Array.isArray(a) ||
        a.scheme !== 'exact' || typeof a.network !== 'string' ||
        typeof a.amount !== 'string' || !/^(0|[1-9][0-9]{0,37})$/.test(a.amount) ||
        !EVM_ADDRESS.test(a.asset || '') || !EVM_ADDRESS.test(a.payTo || '')) {
      throw Error('Malformed or unsupported x402 exact EVM offer at index ' + i);
    }
    const canonicalBaseUSDC = a.network === BASE_NETWORK &&
      a.asset.toLowerCase() === BASE_CIRCLE_USDC;
    return {
      scheme: a.scheme,
      network: a.network,
      asset: a.asset,
      amountAtomic: a.amount,
      nativeCircleBaseUSDC: canonicalBaseUSDC,
      amountUSDC: canonicalBaseUSDC ? decimalSixAtomic(a.amount) : null,
      payTo: a.payTo
    };
  });
  if (options.expectVm5CsvReport) {
    if (j.resource.url !== VM5_CSV_URL || offers.length !== 1 ||
        offers[0].scheme !== 'exact' ||
        offers[0].network !== BASE_NETWORK ||
        offers[0].asset.toLowerCase() !== BASE_CIRCLE_USDC ||
        offers[0].amountAtomic !== '5000' ||
        offers[0].payTo.toLowerCase() !== VM5_PUBLISHED_PAYTO) {
      throw Error('Unpaid quote did NOT match the original documented VM5 CSV GET terms; stop.');
    }
  }
  return {
    kind: 'UNSIGNED_X402_V2_QUOTE_STRUCTURE_ONLY_NOT_SETTLEMENT',
    x402Version: 2,
    resourceUrl: j.resource.url,
    offers,
    fixtureOnly: options.fixtureOnly === true,
    caution: 'Does not confirm wallet ownership, safety, subscription terms, purchaser payment, real settlement or paid HTTP 200 delivery. Buyer must request fresh terms and knowingly authorize any spending.'
  };
}

async function readBoundedStdin() {
  let total = 0;
  const chunks = [];
  for await (const chunk of process.stdin) {
    total += chunk.length;
    if (total > MAX_STDIN) throw Error('Input too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write('Usage: node inspect-payment-required.mjs [--demo] [--expected-url HTTPS_URL] [--expect-vm5-csv-report] < unsigned-header.txt\n');
    return;
  }
  const allowed = new Set(['--demo','--expected-url','--expect-vm5-csv-report']);
  for (let i=0; i<args.length; i++) {
    if (!allowed.has(args[i])) throw Error('Unknown option. Use --help.');
    if (args[i] === '--expected-url') {
      if (!args[i+1]) throw Error('--expected-url requires HTTPS URL.');
      i++;
    }
  }
  const idx = args.indexOf('--expected-url');
  const expectedUrl = idx === -1 ? null : args[idx+1];
  const demo = args.includes('--demo');
  const expectVm5CsvReport = args.includes('--expect-vm5-csv-report');
  if (demo && (expectedUrl || expectVm5CsvReport)) throw Error('Fictional demo must not be represented as live seller verification.');
  let text;
  if (demo) {
    const file = fileURLToPath(new URL('../fixtures/unsigned-v2-demo.json', import.meta.url));
    text = readFileSync(file).toString('base64');
  } else {
    text = await readBoundedStdin();
  }
  const report = inspectUnsignedQuote(text, { expectedUrl, expectVm5CsvReport, fixtureOnly:demo });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => {
    process.stderr.write('QUOTE_INSPECTION_ERROR: ' + String(e.message).slice(0,190) + '\n');
    process.exitCode = 2;
  });
}
