---
name: x402-quote-preflight
description: Inspect an unsigned x402 v2 HTTP 402 payment challenge and diagnose required POST-body HTTP 400 false negatives before optional Base USDC purchasing. Use when checking merchant resource URLs, network, token address, price and payTo without connecting a wallet or paying, and when guiding agent developers through an explicitly user-authorized x402 API purchase.
license: MIT
metadata:
  author: VM5 Delivery Lab (AI-assisted; one economic owner)
  version: "1.0.0"
  homepage: https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/csv-quality/
---
# x402 v2 unsigned quote preflight

Use this when an agent developer wants to diagnose an unsigned x402 v2 HTTP 402 quote and understand why a required-input HTTP POST may return 400 before the payment step. This is NOT a wallet, security auditor, settlement verifier, signer, funding client, account-registration tool or permission to spend any money.

## Step 1: start with real free value

For a free, browser-local CSV structural check use:
https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/

For a completely synthetic free remote JSON sample, see:
https://vm5-openapi-x402.onrender.com/v1/csv-sample

Never upload private customer invoices, client wallet addresses, production credentials, signing material, or nonpublic financial data to an external diagnostics service or an AI agent.

## Step 2: distinguish POST validation from x402 payment

The original VM5 hosted optional paid POST /v1/csv-preflight requires JSON field csvText and validates it BEFORE quoting. A POST with empty JSON can properly return HTTP 400. That does NOT prove x402 is broken.

Only with the user's explicit permission to query the public merchant, test a completely invented body:

~~~sh
curl -i --max-time 30 -X POST 'https://vm5-openapi-x402.onrender.com/v1/csv-preflight' \
  -H 'Content-Type: application/json' \
  --data '{"csvText":"name,amount\nFAKE_ALPHA,2\nFAKE_BETA,bad\n","expectedColumns":["name","amount"]}'
~~~

This is intended to obtain an UNSIGNED 402 PAYMENT-REQUIRED quote. It does not pay anyone, prove a buyer settlement or demonstrate paid HTTP 200 delivery. Never send an actual private CSV here.

If a request returns 400 without a valid required body, classify INPUT_REQUIRED. If a complete valid fictional request returns 402, classify QUOTE_SHOWN_NOT_PAID. If unavailable/503/timeouts, classify UNKNOWN; do not automatically retry a signed purchase after ambiguous payment settlement.

## Step 3: inspect public quote OFFLINE (zero network)

Read the source code and run the included standard-library-only tool with a fictional fixture first:

~~~sh
node skills/x402-quote-preflight/scripts/inspect-payment-required.mjs --demo
~~~

For a caller-supplied UNSIGNED PUBLIC base64 PAYMENT-REQUIRED header from a request the buyer already authorized, paste ONLY that unsigned public header into a LOCAL text file, then:

~~~sh
node skills/x402-quote-preflight/scripts/inspect-payment-required.mjs --expected-url https://vm5-openapi-x402.onrender.com/v1/csv-preflight < unsigned-public-header.txt
~~~

To compare against the original VM5 GET resource documented exact network, Circle Base USDC asset, 5000 atomic units and public payee (NOT proof of wallet control):

~~~sh
node skills/x402-quote-preflight/scripts/inspect-payment-required.mjs --expect-vm5-csv-report < unsigned-public-header.txt
~~~

This tool makes ZERO external calls or wallet requests, verifies x402Version 2 and basic strict HTTPS resource/offer format, and shows six-decimal USDC ONLY when the exact native Circle Base token on chain eip155:8453 is present. It cannot certify that a seller still controls the public wallet, that paid settlement/delivery succeeded, or that an off-chain API has no risks. NEVER feed PAYMENT-SIGNATURE, session cookies, authorization headers, private keys, mnemonic phrases or OTPs to this tool.

## Step 4: buyer-authorized OPTIONAL paid action is separate

Our already existing hosted API offers GET https://vm5-openapi-x402.onrender.com/v1/csv-report and paid POST /v1/csv-preflight for an advertised 0.005 native Circle Base USDC per call (5000 six-decimal atomic units), subject to a fresh independent unsigned quote. This pricing and original public payee are seller documentation, not independent proof that an unknown wallet owner should be trusted.

The x402 v2 HTTP transport specifies the canonical base64 PAYMENT-REQUIRED HEADER. A missing optional JSON-body mirror can cause an older-client warning without proving that the x402 v2 payment handshake failed:
https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md

The optional independent public diagnostic https://x402-doctor.fizzl.eu/ is run ONLY if the user separately chooses to send the public resource URL and a fully fictional body to that third party. No automatic Fizzl requests are executed by this skill; it is not an endorsement or revenue.

For machine discovery, the original public PayAI Bazaar owner-payee filter previously indexed ONE old GET product:
https://facilitator.payai.network/discovery/resources?payTo=0x6b01efa0705e91a7aca54271510bf9e594717f34&limit=100
Catalog entries can be stale and are NOT a paid order.

A real buyer must deliberately opt in to the exact payment terms and independently choose a trusted signing client. NEVER sign, approve, import keys, pay gas, auto-fund, spend/bridge/swap USDC, retry an ambiguous paid call, or self-purchase for testing. The user must confirm network, token, amount, payTo, resource, licensing, acceptance, refund and settlement BEFORE authorizing payment. After payment, match paid HTTP 200 delivery and a unique finalized transaction separately.

## Step 5: report precisely

State: INPUT_REQUIRED / QUOTE_SHOWN_NOT_PAID / UNKNOWN; exact requested method, resource URL, scheme, chain, asset address, amountAtomic, display amount if canonical Base USDC, and payTo. Finish with "UNSIGNED QUOTE IS NOT A PURCHASE OR FINAL SETTLEMENT." If input is insufficient or mismatched, do not guess a wallet or payment.

This skill is technically distinct from the same-one-owner VM1 paperpilot-csv-preflight agent skill, which performs local CSV parsing. This skill explains x402 v2 payment-challenge semantics and validates publicly available unsigned offer metadata, not local CSV quality.
