import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('docs/fiat-stablecoin-audit/index.html','utf8');
const readme=readFileSync('README.md','utf8');
test('one neutral third-party directory link appears visibly inside original free tool footer',()=>{
 const footer=html.slice(html.indexOf('</main><footer>'),html.indexOf('</body>'));
 const url='https://twelve.tools/';
 assert.equal(html.split(url).length-1,1);
 assert.ok(footer.includes('Discover other tools at '));
 assert.ok(footer.includes('<a href="https://twelve.tools/" target="_blank" rel="noopener noreferrer">Twelve Tools</a>'));
 assert.ok(footer.includes('independent directory'));
 assert.ok(readme.includes('We paid nothing'));
 assert.ok(readme.includes('does not claim the directory approved the product'));
});
test('free checker, human inquiry, genuine 49 USDC quote and no-network boundaries unchanged',()=>{
 assert.ok(html.includes('https://docs.google.com/forms/d/e/1FAIpQL'));
 assert.ok(html.includes('49 USDC FIXED marketplace offer'));
 assert.ok(html.includes('ZERO actual purchases to date'));
 assert.ok(html.includes("connect-src 'none'"));
 for (const id of ['funding-file','invoices-file','payouts-file'])assert.ok(html.includes('id="'+id+'"'));
 for (const unsafe of ['window.ethereum','ethereum.request','solana.request','fetch("https://twelve.tools'])assert.ok(!html.includes(unsafe));
});
