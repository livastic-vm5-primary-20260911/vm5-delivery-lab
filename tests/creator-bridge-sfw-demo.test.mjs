import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('docs/demos/creator-bridge');
const file=(f)=>fs.readFileSync(path.join(root,f),'utf8');

test('mobile, accessible, non-custodial opt-in preview',()=>{
  const html=file('index.html');
  assert.match(html,/name="viewport"/);
  assert.match(html,/type="email".*required/);
  assert.match(html,/id="join"/);
  assert.match(html,/id="links".*hidden/);
  assert.match(html,/No thanks, show me the links/);
  assert.match(html,/role="status" aria-live="polite"/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/No emails are saved, sent or subscribed/i);
  assert.doesNotMatch(html,/<script[^>]+src="https?:\/\//i);
});
test('no external requests, no storage, no unsafe script injection',()=>{
  const js=file('app.mjs');
  assert.doesNotMatch(js,/\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)\b/);
  assert.doesNotMatch(js,/innerHTML|eval\s*\(/);
  assert.match(js,/new URL\(destination\)/);
  assert.match(js,/url\.protocol === 'https:'/);
  assert.match(js,/input\.value = ''/);
  assert.match(js,/event\.preventDefault\(\)/);
  assert.match(js,/hashchange/);
});
test('mobile breakpoints, reduced motion, client-editable social links and documentation',()=>{
  const css=file('styles.css'), config=file('config.mjs'), readme=file('README.md');
  assert.match(css,/@media\(max-width:520px\)/);
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(config,/destination: ''/);
  assert.match(readme,/not a finished commissioned client project/);
  for(const f of ['index.html','config.mjs','app.mjs','styles.css','README.md']) assert.ok(fs.statSync(path.join(root,f)).size>100);
});
