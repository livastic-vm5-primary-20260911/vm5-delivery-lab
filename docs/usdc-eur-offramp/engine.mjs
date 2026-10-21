/**
 * Offline *reported-record* join for invoices -> reported Base USDC Transfer
 * -> reported conversion -> reported EUR bank credit. No RPC, network or custody.
 * The matching inputs are supplied by a visitor and are NOT primary evidence.
 */
export const BASE_USDC = '0x833589fcD6EDb6e08f4c7C32D4f71b54bdA02913'.toLowerCase();
export const LIMIT = Object.freeze({ chars: 80_000, rows: 300, lines: 1200 });
export const HEADER = Object.freeze({
  invoices: ['invoice_id','expected_usdc'],
  transfers: ['invoice_id','receipt_id','amount_usdc','chain','token','status'],
  conversions: ['receipt_id','conversion_id','source_usdc','gross_eur','fee_eur','net_eur','executed_at_utc'],
  bank: ['conversion_id','net_eur','status','posted_at_utc']
});
const FILES = Object.keys(HEADER);

export function parseCSV(source, required, label='csv') {
  if (typeof source !== 'string' || !source.trim()) throw new Error(label+': EMPTY_CSV');
  if (source.length>LIMIT.chars) throw new Error(label+': CSV_TOO_LARGE');
  const text = source.replace(/^\uFEFF/,'');
  const rows=[]; let cells=[],value='',quoted=false,afterQuote=false,fieldStart=true;
  let physicalLine=1, recordLine=1;
  function finishCell(){cells.push(value.trim());value='';afterQuote=false;fieldStart=true;}
  function finishRow(){
    finishCell();
    if(cells.some(c=>c!=='')) rows.push({cells,line:recordLine});
    cells=[];
    if(rows.length>LIMIT.rows+1) throw new Error(label+': ROW_LIMIT');
  }
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;afterQuote=true;}}
      else {
        value+=c;
        if(c==='\r'||(c==='\n'&&text[i-1]!=='\r')) physicalLine++;
        if(physicalLine>LIMIT.lines)throw new Error(label+': LINE_LIMIT');
      }
    }else if(afterQuote){
      if(c===','){finishCell();}
      else if(c==='\n'||c==='\r'){finishRow();if(c==='\r'&&text[i+1]==='\n')i++;physicalLine++;recordLine=physicalLine;if(physicalLine>LIMIT.lines)throw new Error(label+': LINE_LIMIT');}
      else if(c!==' '&&c!=='\t')throw new Error(label+': BAD_CSV_QUOTE');
    }else if(c===',')finishCell();
    else if(c==='\n'||c==='\r'){finishRow();if(c==='\r'&&text[i+1]==='\n')i++;physicalLine++;recordLine=physicalLine;if(physicalLine>LIMIT.lines)throw new Error(label+': LINE_LIMIT');}
    else if(c==='"'){
      if(!fieldStart)throw new Error(label+': BAD_CSV_QUOTE');
      quoted=true;fieldStart=false;
    }else{
      if(c!==' '&&c!=='\t')fieldStart=false;
      value+=c;
    }
  }
  if(quoted) throw new Error(label+': UNCLOSED_QUOTE');
  // Avoid inventing an extra blank row after the final newline.
  if(cells.length||value!==''||afterQuote)finishRow();
  if(!rows.length)throw new Error(label+': EMPTY_CSV');
  const headers=rows.shift().cells.map(x=>x.toLowerCase());
  if(new Set(headers).size!==headers.length)throw new Error(label+': DUPLICATE_HEADER');
  for(const key of required)if(!headers.includes(key))throw new Error(label+': MISSING_COLUMN_'+key);
  return rows.map(record=>{
    if(record.cells.length!==headers.length)throw new Error(label+': WRONG_COLUMNS_ROW_'+record.line);
    return Object.fromEntries(headers.map((h,col)=>[h,record.cells[col]]).concat([['_row',record.line]]));
  });
}

export function units(text, precision){
  const s=String(text).trim();
  if(!new RegExp('^\\d{1,12}(?:\\.\\d{1,'+precision+'})?$').test(s))throw new Error('INVALID_DECIMAL');
  const [whole,frac='']=s.split('.');
  return BigInt(whole)*10n**BigInt(precision)+BigInt(frac.padEnd(precision,'0'));
}

export function isoUTC(value){
  const text=String(value).trim();
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(text))return null;
  const t=Date.parse(text);
  return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)+'Z'===text?t:null;
}

export function reconcile(data) {
  if(!data||typeof data!=='object')throw new Error('MISSING_INPUTS');
  const input=Object.fromEntries(FILES.map(k=>[k,parseCSV(data[k],HEADER[k],k)]));
  const issues=[];
  function flag(file,row,code,detail){issues.push({file,row,code,detail});}
  function money(file,rec,key,scale){
    try{return units(rec[key],scale);}
    catch{flag(file,rec._row,'INVALID_'+key.toUpperCase(),'Invalid nonnegative '+key+' decimal or precision.');return null;}
  }
  function unique(file,rows,key){
    const m=new Map();
    for(const record of rows){
      const value=record[key];
      if(!value){flag(file,record._row,'MISSING_'+key.toUpperCase(),'A stable explicit reference is required.');continue;}
      if(m.has(value)){
        flag(file,record._row,'DUPLICATE_'+key.toUpperCase(),'Repeated reference; no implicit aggregation or double-counting.');
        flag(file,m.get(value)._row,'DUPLICATE_'+key.toUpperCase(),'Same reference appears on another row.');
        m.delete(value); // Ambiguous matches must not appear as valid.
      }else m.set(value,record);
    }
    // repeated three+ times also cannot be treated as valid.
    for(const value of rows.map(r=>r[key]).filter(Boolean)){
      if(rows.filter(r=>r[key]===value).length>1)m.delete(value);
    }
    return m;
  }
  const invoices=unique('invoices',input.invoices,'invoice_id');
  const transfers=unique('transfers',input.transfers,'receipt_id');
  const conversions=unique('conversions',input.conversions,'conversion_id');
  const bank=unique('bank',input.bank,'conversion_id');
  const transfersByInvoice=new Map();

  for(const r of input.invoices)money('invoices',r,'expected_usdc',6);
  for(const r of input.transfers){
    const amount=money('transfers',r,'amount_usdc',6);
    if(!r.invoice_id||!invoices.has(r.invoice_id))
      flag('transfers',r._row,'UNMATCHED_INVOICE','No unique invoice_id exists for this transfer.');
    if(r.chain!=='eip155:8453'||r.token.toLowerCase()!==BASE_USDC)
      flag('transfers',r._row,'WRONG_OR_UNSUPPORTED_ASSET','Only canonical Circle USDC on Base eip155:8453 is within this local example.');
    if(r.status!=='reported_finalized')
      flag('transfers',r._row,'UNCONFIRMED_TRANSFER_STATUS','Imported status is not explicitly reported_finalized; no actual blockchain RPC is used.');
    if(amount!==null&&amount===0n)flag('transfers',r._row,'ZERO_USDC_TRANSFER','Reported transfer amount must be positive.');
    if(amount!==null&&amount>0n&&transfers.has(r.receipt_id)&&invoices.has(r.invoice_id)){
      const list=transfersByInvoice.get(r.invoice_id)||[];
      list.push(r);
      transfersByInvoice.set(r.invoice_id,list);
    }
  }

  for(const r of input.invoices){
    if(!invoices.has(r.invoice_id))continue;
    const expected=money('invoices',r,'expected_usdc',6);
    const related=transfersByInvoice.get(r.invoice_id)||[];
    if(related.length===0){flag('invoices',r._row,'NO_REPORTED_TRANSFER','No unique transfer row tied to this invoice.');continue;}
    const valid=related.filter(t=>t.status==='reported_finalized'&&t.chain==='eip155:8453'&&t.token.toLowerCase()===BASE_USDC);
    let sum=0n;let good=0;
    for(const t of valid){try{sum+=units(t.amount_usdc,6);good++;}catch{}}
    if(expected!==null&&good===valid.length&&sum!==expected)
      flag('invoices',r._row,'USDC_INVOICE_MISMATCH','Reported USDC total differs from invoice. This is not blockchain settlement proof.');
  }
  const conversionsByReceipt=new Map();
  for(const r of input.conversions){
    const source=money('conversions',r,'source_usdc',6);
    const gross=money('conversions',r,'gross_eur',2);
    const fee=money('conversions',r,'fee_eur',2);
    const net=money('conversions',r,'net_eur',2);
    const time=isoUTC(r.executed_at_utc);
    if(time===null)flag('conversions',r._row,'INVALID_CONVERSION_TIMESTAMP','Supply a stated UTC execution time; FX rates are not inferred.');
    if(gross!==null&&fee!==null&&net!==null&&(gross<fee||gross-fee!==net))
      flag('conversions',r._row,'NET_EUR_MATH_MISMATCH','Reported gross EUR - fee EUR != net EUR.');
    if(!r.receipt_id||!transfers.has(r.receipt_id))
      flag('conversions',r._row,'UNMATCHED_USDC_RECEIPT','No unique receipt_id in supplied transfer rows.');
    if(r.receipt_id){
      const bucket=conversionsByReceipt.get(r.receipt_id)||[];
      bucket.push(r);conversionsByReceipt.set(r.receipt_id,bucket);
    }
    if(transfers.has(r.receipt_id)){
      const tr=transfers.get(r.receipt_id);
      let actual=null;try{actual=units(tr.amount_usdc,6);}catch{}
      if(actual!==null&&source!==null&&actual!==source)
        flag('conversions',r._row,'SOURCE_USDC_MISMATCH','Offramp reported source USDC does not equal referenced receipt amount.');
      if(tr.status!=='reported_finalized')
        flag('conversions',r._row,'OFFRAMP_LINKED_TO_UNCONFIRMED_RECEIPT','Receipt status is not reported_finalized.');
    }
  }
  for(const [receiptId,items] of conversionsByReceipt){
    if(items.length>1)for(const r of items)flag('conversions',r._row,'ONE_TO_MANY_CONVERSION_UNSUPPORTED','Several conversions share one transfer. This tool cannot allocate partial offramps.');
  }
  for(const r of input.transfers){
    if(transfers.has(r.receipt_id)&&r.status==='reported_finalized'&&!conversionsByReceipt.has(r.receipt_id))
      flag('transfers',r._row,'NO_OFFRAMP_CONVERSION','Reported finalized receipt has no explicitly linked conversion.');
  }
  for(const r of input.bank){
    const amount=money('bank',r,'net_eur',2);
    const posted=isoUTC(r.posted_at_utc);
    if(posted===null)flag('bank',r._row,'INVALID_BANK_TIMESTAMP','Bank posted_at_utc is not an unambiguous UTC time.');
    if(r.status!=='reported_posted')
      flag('bank',r._row,'UNCONFIRMED_BANK_STATUS','Imported row does not say reported_posted; no bank confirmation is performed.');
    if(!conversions.has(r.conversion_id))
      flag('bank',r._row,'UNMATCHED_CONVERSION','No unique conversion_id exists. Aggregated bank credits require external allocation evidence.');
    else{
      const cv=conversions.get(r.conversion_id);
      let exp=null;try{exp=units(cv.net_eur,2);}catch{}
      if(amount!==null&&exp!==null&&amount!==exp)
        flag('bank',r._row,'BANK_EUR_MISMATCH','Reported bank EUR amount differs from conversion net EUR.');
      const executed=isoUTC(cv.executed_at_utc);
      if(posted!==null&&executed!==null&&posted<executed)
        flag('bank',r._row,'BANK_POSTED_BEFORE_CONVERSION','Reported bank posting precedes linked conversion execution.');
    }
  }
  for(const r of input.conversions){
    if(conversions.has(r.conversion_id)&&!bank.has(r.conversion_id))
      flag('conversions',r._row,'NO_BANK_CREDIT','No unique bank credit references this conversion.');
  }
  return {
    summary:{invoiceRows:input.invoices.length,transferRows:input.transfers.length,conversionRows:input.conversions.length,bankRows:input.bank.length,findings:issues.length,
      note:'All records, statuses and amounts are visitor supplied; 0 independent blockchain, exchange or bank confirmations.'},
    issues
  };
}
export function sanitizedCsvReport(result){
  if(!result||!Array.isArray(result.issues))throw new Error('MISSING_FINDINGS');
  const safe=['file,row,code'];
  for(const r of result.issues){
    if(!FILES.includes(r.file)||!Number.isSafeInteger(r.row)||r.row<2||r.row>LIMIT.lines||!/^[A-Z_]+$/.test(r.code))
      throw new Error('UNSAFE_FINDING');
    safe.push(r.file+','+r.row+','+r.code);
  }
  return safe.join('\n')+'\n';
}
