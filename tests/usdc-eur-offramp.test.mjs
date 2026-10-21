import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {BASE_USDC,HEADER,LIMIT,isoUTC,parseCSV,units,reconcile,sanitizedCsvReport} from '../docs/usdc-eur-offramp/engine.mjs';
const t='eip155:8453',token='0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913';
const fake={
 invoices:'invoice_id,expected_usdc\nI1,10.000000',
 transfers:'invoice_id,receipt_id,amount_usdc,chain,token,status\nI1,R1,10,'+t+','+token+',reported_finalized',
 conversions:'receipt_id,conversion_id,source_usdc,gross_eur,fee_eur,net_eur,executed_at_utc\nR1,C1,10,9.00,0.50,8.50,2026-10-19T10:00:00Z',
 bank:'conversion_id,net_eur,status,posted_at_utc\nC1,8.50,reported_posted,2026-10-20T10:00:00Z'
};
function run(m={}){return reconcile({...fake,...m});}
function codes(x){return x.issues.map(z=>z.code);}
test('baseline fictitious four-way mapping contains zero structural exceptions and no proof claim',()=>{
 const x=run();assert.equal(x.summary.invoiceRows,1);assert.equal(x.summary.findings,0);
 assert.match(x.summary.note,/0 independent blockchain/);
});
test('correct header CSV with UTF8 BOM and CRLF',()=>{
 assert.deepEqual(parseCSV('\uFEFFid,val\r\na,"b,b"\r\n',['id','val'])[0],{id:'a',val:'b,b',_row:2});
});
test('escaped quotes parse without splitting',()=>assert.equal(parseCSV('x\n"two ""quoted"" words"',['x'])[0].x,'two "quoted" words'));
test('no invented blank final row',()=>assert.equal(parseCSV('x,y\na,b\n',['x','y']).length,1));
test('reject unclosed quotes',()=>assert.throws(()=>parseCSV('x\n"oops',['x']),/UNCLOSED_QUOTE/));
test('reject raw mid-field quote',()=>assert.throws(()=>parseCSV('x\nabc"def',['x']),/BAD_CSV_QUOTE/));
test('reject characters following a closing quote',()=>assert.throws(()=>parseCSV('x\n"abc"x',['x']),/BAD_CSV_QUOTE/));
test('reject duplicate header',()=>assert.throws(()=>parseCSV('x,x\na,b',['x']),/DUPLICATE_HEADER/));
test('reject missing columns',()=>assert.throws(()=>parseCSV('x,y\na,b',['other']),/MISSING_COLUMN_other/));
test('reject rows with different field count',()=>assert.throws(()=>parseCSV('x,y\na',['x','y']),/WRONG_COLUMNS_ROW_2/));
test('reject empty CSV',()=>assert.throws(()=>parseCSV(' \n',['x']),/EMPTY_CSV/));
test('reject long user files',()=>assert.throws(()=>parseCSV('x\n'+'z'.repeat(LIMIT.chars),['x']),/CSV_TOO_LARGE/));
test('reject >300 data rows',()=>assert.throws(()=>parseCSV('x\n'+'ok\n'.repeat(301),['x']),/ROW_LIMIT/));
test('USDC fixed integer precision',()=>assert.equal(units('0.000001',6),1n));
test('EUR fixed integer precision',()=>assert.equal(units('0.01',2),1n));
test('floating imprecision cannot leak through BigInt',()=>assert.equal(units('0.1',2)+units('0.2',2),units('0.30',2)));
test('reject excess USDC precision',()=>assert.throws(()=>units('0.0000009',6),/INVALID_DECIMAL/));
test('reject negative and scientific amounts',()=>{assert.throws(()=>units('-1',2));assert.throws(()=>units('1e2',2));});
test('UTC timestamp strict and valid',()=>{assert.equal(isoUTC('2026-10-19T10:00:00Z'),Date.parse('2026-10-19T10:00:00Z'));assert.equal(isoUTC('2026-02-30T10:00:00Z'),null);assert.equal(isoUTC('2026-10-19 10:00:00'),null);});
test('mismatched invoice amount flags but never marks paid',()=>assert.ok(codes(run({invoices:fake.invoices.replace('10.000000','11.00')})).includes('USDC_INVOICE_MISMATCH')));
test('wrong chain cannot be interpreted as canonical Base receipt',()=>assert.ok(codes(run({transfers:fake.transfers.replace('eip155:8453','eip155:1')})).includes('WRONG_OR_UNSUPPORTED_ASSET')));
test('wrong token cannot be interpreted as canonical Base USDC',()=>assert.ok(codes(run({transfers:fake.transfers.replace(token,'0x0000000000000000000000000000000000000000')})).includes('WRONG_OR_UNSUPPORTED_ASSET')));
test('pending receipt is not verified',()=>assert.ok(codes(run({transfers:fake.transfers.replace('reported_finalized','pending')})).includes('UNCONFIRMED_TRANSFER_STATUS')));
test('misidentified receipt breaks conversion chain',()=>assert.ok(codes(run({conversions:fake.conversions.replace('R1,C1','RZZ,C1')})).includes('UNMATCHED_USDC_RECEIPT')));
test('duplicate receipt ID raises error and cannot be counted twice',()=>{
 const x=run({transfers:fake.transfers+'\nI1,R1,10,'+t+','+token+',reported_finalized'});
 assert.ok(codes(x).includes('DUPLICATE_RECEIPT_ID'));
 assert.ok(codes(x).includes('NO_REPORTED_TRANSFER'));
});
test('duplicate invoice ID blocks ambiguous allocation',()=>{
 const x=run({invoices:fake.invoices+'\nI1,10'});
 assert.ok(codes(x).includes('DUPLICATE_INVOICE_ID'));
 assert.ok(codes(x).includes('UNMATCHED_INVOICE'));
});
test('exchange reported fee math invalid',()=>assert.ok(codes(run({conversions:fake.conversions.replace('9.00,0.50,8.50','9.00,0.50,8.51')})).includes('NET_EUR_MATH_MISMATCH')));
test('source receipt amount must match gross USDC converted',()=>assert.ok(codes(run({conversions:fake.conversions.replace('R1,C1,10,','R1,C1,9,')})).includes('SOURCE_USDC_MISMATCH')));
test('source receipt can only have one unique 1:1 conversion',()=>{
 const x=run({conversions:fake.conversions+'\nR1,C2,10,9.00,0.50,8.50,2026-10-19T10:00:00Z'});
 assert.ok(codes(x).includes('ONE_TO_MANY_CONVERSION_UNSUPPORTED'));
});
test('missing bank reference produces two-sided exact review findings',()=>assert.ok(codes(run({bank:fake.bank.replace('C1,8.50','C3,8.50')})).includes('UNMATCHED_CONVERSION')));
test('short bank EUR transfer yields mismatch',()=>assert.ok(codes(run({bank:fake.bank.replace('C1,8.50','C1,8.00')})).includes('BANK_EUR_MISMATCH')));
test('pending bank settlement not deemed paid',()=>assert.ok(codes(run({bank:fake.bank.replace('reported_posted','pending')})).includes('UNCONFIRMED_BANK_STATUS')));
test('bank date before offramp is suspicious, not automatically reconciled',()=>assert.ok(codes(run({bank:fake.bank.replace('2026-10-20T10:00:00Z','2026-10-18T10:00:00Z')})).includes('BANK_POSTED_BEFORE_CONVERSION')));
test('duplicate conversion id flags even identical rows',()=>{
 const x=run({conversions:fake.conversions+'\n'+fake.conversions.split('\n')[1]});
 assert.ok(codes(x).includes('DUPLICATE_CONVERSION_ID'));
});
test('null/undefined source fails closed',()=>assert.throws(()=>reconcile(null),/MISSING_INPUTS/));
test('missing conversion for reported transfer fails closed',()=>assert.ok(codes(run({conversions:'receipt_id,conversion_id,source_usdc,gross_eur,fee_eur,net_eur,executed_at_utc'})).includes('NO_OFFRAMP_CONVERSION')));
test('row-only export never includes ids, wallet, amounts or descriptions',()=>{
 const x=run({bank:fake.bank.replace('C1,8.50','C1,8.00')});
 const s=sanitizedCsvReport(x);
 assert.match(s,/^file,row,code\n/);
 assert.ok(s.includes('BANK_EUR_MISMATCH'));
 assert.ok(!s.includes('I1')&&!s.includes('R1')&&!s.includes('C1')&&!s.includes('8.50'));
});
test('unsafe findings cannot become CSV spreadsheet formula payloads',()=>{
 assert.throws(()=>sanitizedCsvReport({issues:[{file:'=BOMB',row:2,code:'ERR'}]}),/UNSAFE_FINDING/);
 assert.throws(()=>sanitizedCsvReport({issues:[{file:'bank',row:2,code:'=HYPERLINK'}]}),/UNSAFE_FINDING/);
});
test('page is static, local and explicitly non-verifying',()=>{
 const path=resolve(dirname(fileURLToPath(import.meta.url)),'../docs/usdc-eur-offramp');
 const html=readFileSync(resolve(path,'index.html'),'utf8');
 const app=readFileSync(resolve(path,'app.mjs'),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/No sale or customer is claimed/i);
 assert.match(html,/NOT settlement verification/);
 assert.match(html,/49 native Base Circle USDC pilot/);
 assert.match(html,/rel="describedby"/);
 assert.equal((html.match(/id="compare"/g)||[]).length,1);
 for(const x of ['fetch(', 'XMLHttpRequest','window.ethereum','navigator.sendBeacon','localStorage','sessionStorage'])assert.ok(!app.includes(x),'Unexpected browser side-effect '+x);
 assert.ok(!html.includes('https://cdn.')&&!html.includes('https://fonts.'));
 for(const k of Object.keys(HEADER))assert.ok(html.includes('id="'+k+'"'));
});
test('row-only CSV report preserves physical source line after blank row',()=>{
 const x=parseCSV('x,y\n\na,b\n',['x','y']);
 assert.equal(x[0]._row,3);
});
test('quoted multiline field preserves source line number in later rows',()=>{
 const x=parseCSV('x,y\n"line1\nline2",a\nb,c',['x','y']);
 assert.equal(x[0]._row,2);
 assert.equal(x[1]._row,4);
});
