# USDC to EUR Off-ramp Exception Finder (VM5 Delivery Lab)

**Public page after merge and successful GitHub Pages build:**
https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/usdc-eur-offramp/

The real engineering problem arises from finance operators struggling to match a customer USDC invoice and receipt, exchange conversion to EUR, and later bank credit. This original free tool handles the opposite direction to VM5's existing fiat-funded to stablecoin contractor payout audit.

**Scope:** Four visitor-supplied CSVs: invoice_id expected USDC, receipt_id self-reported Base Circle USDC transfer, explicit one-to-one conversion_id reported EUR conversion and fees, and conversion_id self-reported bank credit. This tool flags duplicate/absent references, wrong chain/token, pending statuses, amount mismatch, missing conversion, missing bank record, invalid UTC timestamps, and inconsistent gross EUR minus fee vs net EUR. It parses quoted CSV locally; USDC 6 decimals and EUR 2 decimals use integer arithmetic (BigInt). It never guesses forex rates or fabricates bank attestations.

**Critical:** Matching reported CSV data is NOT verification of a bank balance, conversion, exchange settlement, actual ERC-20 logs, tax/audit compliance, wallet ownership or real payments. A pooled bank credit or split off-ramp is intentionally not allocated, even if amounts match. With zero findings, the only thing established is syntactic consistency of supplied rows. The tool does not perform RPC, wallet signing, custody, money transmission or forex trades. The browser CSP sets connect-src 'none'. No credentials, PII, login, uploads, cookies, analytics or user files are persisted by the site; parsing is local after static assets are fetched. Optional report has only category, row and finding code. Invoice IDs, amounts and wallet strings are never intentionally sent to a remote service by our app. Do not test with unapproved confidential financial information.

## Quick local test

From repository root run:

    node --test tests/usdc-eur-offramp.test.mjs
    node --test tests/*.test.mjs

Core source: docs/usdc-eur-offramp/engine.mjs. Browser: docs/usdc-eur-offramp/index.html, app.mjs, style.css. The initial sample contains three wholly invented invoices and two example off-ramps, with pending transfer and short EUR credit issues; no real chain or bank statement.

**Indicative commercial option**: 49 native Base Circle USDC for ONE independently agreed synthetic-only source-format adapter and deterministic tests, not automatic checkout. Before accepting paid work a real outside buyer and lawful human payee must agree in writing on fields, data rights, AI disclosure, acceptance/refund/IP/payment/identity and terms. ZERO customers, orders or income are claimed from this specific product.

ONE ultimate human economic owner across VM1/VM2/VM3/VM5; no self-purchases, fake reviews or resource-rental/DePIN.
