# Nova Studio — fictional, SFW mobile creator bridge

**Purpose:** Original independently created portfolio example in response to a public request for a fast mobile creator landing screen with email opt-in and a "No thanks" link page. This is not a finished commissioned client project. No buyer brand, personally identifying image, private asset or real third-party account is used.

- Mobile-first accessible opt-in screen with browser-native email validation and an explicit skip route.
- All social destinations are intentionally placeholders; changing `config.mjs` can add HTTPS URLs without editing layout code.
- **Preview only:** no email collection, network transmission, persistence, subscriptions or analytics. The Content-Security-Policy enforces `connect-src 'none'` and `form-action 'none'`.
- Production implementation requires the client to approve a legal content category, select a provider that explicitly accepts its brand, configure domain DNS, provide double opt-in, unsubscribes and analytics consent; actual recurring hosting/vendor charges must be agreed in advance.
- Production test plan: iOS/Android in-app browsers, email confirmation deliverability, spam and consent logs, UTM attribution, destination link QA, mobile viewport 320px/375px/768px, accessibility.
- Do not describe this demo as already collecting real subscribers or as a finished paid client website.

Demo URL after project Pages deployment:
https://livastic-vm5-primary-20260911.github.io/vm5-delivery-lab/demos/creator-bridge/
