# Local x402 merchant funnel inspector

Original AI-assisted, one human-owned VM5 Delivery Lab freeware.

Live site: https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/x402-merchant-funnel/

## Why it matters

Many x402 sellers observe free preview or HTTP 402 quote calls from crawlers but have no confirmed successful payments. This local-only tool uses five stages to separate a merchant's own **reported** events. It does not know an agent wallet's budget or payment intent.

The static page imports only same-origin JavaScript and CSS. Strict Content Security Policy disallows all outgoing connect/fetch calls. No wallet connection, RPC, token transfer, login, analytics or CSV upload.

## Exact CSV schema

    attempt_id,resource,event,payment_ref,timestamp

- attempt_id: a short synthetic or pseudonymous opaque identifier using only ASCII letters, digits, underscore or hyphen. Do not use a real person, wallet, session key or transaction ID.
- resource: a nonsecret public API route beginning with slash, without query strings.
- event: exactly one of sample, invalid_before_quote, quote, signed_retry, settled, delivered.
- payment_ref: empty unless settled or delivered. For those events, use a locally generated opaque synthetic identifier, not a real chain transaction hash.
- timestamp: offset-aware ISO 8601, such as 2026-10-20T10:00:00Z.

Paid event chain: quote -> signed_retry -> settled -> delivered, unique stages in increasing timestamp order. A free sample and invalid input each have their own attempt ID. Settlement and delivery are explicitly **operator self-reported**, never verified chain facts.

Maximum input: 64 KiB, 500 data rows, five columns per row, 25 nonsecret resource paths. Strict parser rejects invalid quotes, unknown stages, mixed resources, ambiguous sequences, invalid identifiers and oversize files.

Use the invented five-attempt sample button to reproduce expected counts: requests5; quoted4; retried3; settlement reported2; delivered-with-claimed-settlement1; invalid-before-quote1; quote-only1; retry-without-settlement1; settlement-without-delivery1. The 25% quote-to-claimed-delivery ratio does not establish paid revenue or real users.

Duplicate payment references are explicitly flagged and cannot inflate the overall claimed-delivery count. Aggregate JSON downloads omit raw attempt IDs, payment references and timestamps. Never paste actual customer logs, wallet addresses, emails, transaction hashes, private keys or sensitive data into any website.

Real finalized token transfers require separate verification against the correct network, token, payee and unique chain/txHash/logIndex and must be attributed to a successful paid result before recording revenue.

## Tests

At repository root, run:

    node --test tests/x402-merchant-funnel.test.mjs
    node --test tests/x402-merchant-funnel-browser.test.mjs

Browser tests use a loopback-only local static server and already installed headless Chrome / playwright-core, exercise desktop and mobile, sample click, aggregation, clean downloaded JSON, invalid input and zero external network requests. Tests never connect a wallet or spend funds.

## Commercial boundary

The linked indicative 49 native Base Circle USDC synthetic schema-adapter service is not a checkout or confirmed contract. An actual external buyer and the one Korea-based human owner must agree on legal payment terms, scope, AI assistance, licensed data, acceptance, cancellation/refund and deliverable rights **before** work begins. There are no verified outside paying customers for this specific tool.

Separate same-one-owner projects that are not independent buyers: VM1 free x402 quote-size tool and VM3 free x402 browser-CORS checker.
