# OpenAPI 3.0 example with independently observed responses

**File:** [jsonplaceholder.openapi.yaml](./jsonplaceholder.openapi.yaml) (primary human-editable spec) · [JSON companion](./jsonplaceholder.openapi.json) (for [VM5 browser preflight](https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/api-preflight/))

This independently authored example covers three operations of the public, deliberately *fake* [JSONPlaceholder API](https://jsonplaceholder.typicode.com/). It demonstrates a limited but real developer-documentation deliverable: readable YAML, typed schemas, reusable component references, required path parameters, and source-grounded HTTP status examples. It is **not** the project's official spec or a client's commissioned document.

## Reproduced against live public endpoints

At 2026-10-17 KST, VM5 made the following harmless test requests. The response *structure* and first sample post are saved in [evidence](../evidence/jsonplaceholder-http-20261017.json), without tokens or user records.

| Test | Public request | Observed | Documented as |
| --- | --- | --- | --- |
| List | GET /posts | HTTP 200, array of 100 records | HTTP 200 array of Post |
| Read | GET /posts/1 | HTTP 200, fields userId, id, title, body | HTTP 200 Post |
| Missing | GET /posts/999999 | HTTP 404, body empty object | HTTP 404 empty JSON object |
| Simulated create | POST /posts with title, body, userId | HTTP 201; response includes generated ID | HTTP 201 Post, **not persisted** |

The official guide confirms that write operations are simulated and do **not** permanently change the public database. The sample does not assert undocumented 400/401/403 errors or offer any security certification. The GET list count is an observation, not a guarantee.

## Validation

Run from the parent repository:

    node --test tests/*.test.mjs
    npx --yes @redocly/cli@2.64.1 lint examples/jsonplaceholder.openapi.yaml --format=stylish

At creation, the combined Node test suite had **26 passed, 0 failed** (including ten tests specifically checking this sample). Redocly's default recommended configuration returned **0 errors and 2 advisory warnings**. The warnings request explicit 4xx response declarations for GET /posts and POST /posts. Those paths returned 200 and 201, respectively, during verification, and a real 4xx status was *not* observed for those operations, so we deliberately did not invent one merely to make a linter green. The single-record GET's observed 404 is included.

The YAML is the edited source of truth. Its JSON companion was generated using Python yaml.safe_load and json.dumps from that source, then independently checked by the VM5 read-only JavaScript preflight. If either changes, regenerate both together and rerun tests. The JavaScript preflight is not a complete OpenAPI validator.

## Use in a work request

VM5 Delivery Lab can create contract documents from a client's *authorized and sanitized* endpoint list with request/response examples, error descriptions, lint verification and a reproducible handoff. That requires a separately agreed scope and payment. This public sample is a genuine skills demonstration, not evidence of a paid engagement or guaranteed outcome.

Contact: [private project inquiry form](https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform). Do not submit production API keys or customer data.

*Authored with AI assistance by VM5 Delivery Lab, October 17, 2026. Original sample code offered under the MIT license; JSONPlaceholder remains the property of its owners.*
