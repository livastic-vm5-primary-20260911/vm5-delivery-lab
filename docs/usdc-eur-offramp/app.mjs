import {reconcile,sanitizedCsvReport,LIMIT} from './engine.mjs';
const byId=id=>document.getElementById(id);
const textKeys=['invoices','transfers','conversions','bank'];
let mostRecent=null;
function message(text,isError=false){byId('message').textContent=text;byId('message').dataset.error=String(isError);}
function run(){
  mostRecent=null;byId('download').disabled=true;
  try {
    const payload=Object.fromEntries(textKeys.map(k=>[k,byId(k).value]));
    const answer=reconcile(payload);
    byId('summary').textContent=answer.summary.invoiceRows+' invoice rows, '+answer.summary.transferRows+' reported transfer rows, '+answer.summary.conversionRows+' conversion rows, '+answer.summary.bankRows+' bank rows. '+answer.summary.findings+' potential review findings. No actual financial status verified.';
    const body=byId('issues');body.replaceChildren();
    for(const e of answer.issues){
      const tr=document.createElement('tr');
      for(const item of [e.file,String(e.row),e.code,e.detail]){
        const td=document.createElement('td');td.textContent=item;tr.append(td);
      }
      body.append(tr);
    }
    mostRecent=answer;byId('download').disabled=false;
    message(answer.issues.length?'Potential mismatches detected. Report status is not evidence of bank or blockchain settlement.':'No syntactic mismatches found in the supplied CSVs. This is NOT proof of receipt, settlement, ownership or FX valuation.');
  }catch(err){
    byId('issues').replaceChildren();byId('summary').textContent='';
    message('Unable to analyze these CSV inputs. '+String(err.message).replace(/[^a-zA-Z0-9:_ -]/g,''),true);
  }
}
function download(){
  if(!mostRecent)return;
  const blob=new Blob([sanitizedCsvReport(mostRecent)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='usdc-eur-anonymous-exceptions.csv';
  document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
}
const data={
  invoices:'invoice_id,expected_usdc\nINV-F1,220.00\nINV-F2,100.00\nINV-F3,55.50',
  transfers:'invoice_id,receipt_id,amount_usdc,chain,token,status\nINV-F1,TX-F1,220.00,eip155:8453,0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913,reported_finalized\nINV-F2,TX-F2,90.00,eip155:8453,0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913,pending\nINV-F3,TX-F3,55.50,eip155:8453,0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913,reported_finalized',
  conversions:'receipt_id,conversion_id,source_usdc,gross_eur,fee_eur,net_eur,executed_at_utc\nTX-F1,FX-F1,220.00,202.00,2.00,200.00,2026-10-18T10:00:00Z\nTX-F3,FX-F3,55.50,51.20,0.20,51.00,2026-10-18T11:00:00Z',
  bank:'conversion_id,net_eur,status,posted_at_utc\nFX-F1,200.00,reported_posted,2026-10-19T09:00:00Z\nFX-F3,50.00,pending,2026-10-19T09:00:00Z'
};
function loadExample(){for(const k of textKeys)byId(k).value=data[k];run();}
for(const k of textKeys){
  const inp=byId('file-'+k);
  inp.addEventListener('change',async()=>{
    const f=inp.files?.[0];
    if(!f)return;
    if(f.size>LIMIT.chars){message('File too large: '+k+'. Each file must be under 80,000 bytes.',true);return;}
    byId(k).value=await f.text();inp.value='';message('Local '+k+' file loaded. Click Compare; no upload occurred.');
  });
}
byId('compare').addEventListener('click',run);
byId('sample').addEventListener('click',loadExample);
byId('download').addEventListener('click',download);
loadExample();
