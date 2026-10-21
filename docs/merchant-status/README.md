# VM5 public x402 merchant quote readiness canary

A read-only one-shot snapshot of the VM5 owner's own public API. This is a developer trust aid, not a monitoring SLA, not a customer purchase and not proof of successful payment settlement.

- Uses fixed public endpoints owned/operated by VM5.
- GET health and a published static page; GET two x402 quotes; POST one *completely invented* two-row CSV to the original hosted /v1/csv-preflight.
- Validates network eip155:8453, official Circle Base USDC asset, the existing payTo, x402Version2, exact 0.005/0.01 USDC fixed prices.
- No payment signature, wallet interaction, recipient change, chain transfer, secrets, customer data, other vendor port scan or retries.
- Inconclusive network failures are explicitly *unknown*, unexpected quotes or status *degraded*, expected unsigned quote *pass*.
- Published JSON has a timestamp and no claim of continuous uptime, paid delivery, real customers or earnings.

To run exactly one truthful read-only snapshot (update JSON only after inspecting the source):

    node tools/public-x402-checkout-canary.mjs --live
    node --test tests/public-x402-checkout-canary.test.mjs

The site is static GitHub Pages. Production Render server code and deployment, previously tool-safety-blocked, are NOT changed or restarted by this package. To buy the user's already existing separate CSV service, open https://livastic-vm5-primary-20260911.github.io/base-usdc-csv-checkout/ and consciously approve an eligible transaction in the user's **own wallet**. For new B2B scoped reports, use the original private intake https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform and agree on scope/payment before any real work.

AI-assisted original engineering, no genuine independent user signup, signed purchase or cash inferred from this source.
