/* Render only same-origin public, owner-produced single-point-in-time JSON.
   All data becomes textContent; no HTML injection, analytics or wallets. */
const updated=document.getElementById('updated');
const stats=document.getElementById('summary');
const rows=document.getElementById('checks');
const labels={pass:'Expected response observed',degraded:'Unexpected response observed',unknown:'Probe inconclusive'};

function element(tag,parent,css,value){
 const x=document.createElement(tag);
 if(css)x.className=css;
 if(value!==undefined)x.textContent=String(value);
 parent.append(x);
 return x;
}
async function load(){
 let doc;
 try{
  const response=await fetch('./latest.json',{cache:'no-store'});
  if(!response.ok)throw new Error('snapshot missing');
  doc=await response.json();
  if(doc.schema!=='vm5-original-merchant-public-checkout-canary-v1'||!Array.isArray(doc.checks))
   throw new Error('wrong snapshot');
 }catch{
  updated.textContent='No validated status snapshot is available right now. Inspect the live API contract directly; availability is unknown.';
  return;
 }
 const date=new Date(doc.checkedAtUTC);
 updated.textContent='Observed once: '+(Number.isNaN(date.getTime())?doc.checkedAtUTC:date.toISOString())+'. This is NOT continuous uptime or proof of a customer payment.';
 stats.textContent='';
 for(const [name,count] of [['Expected',doc.summary.pass],['Unexpected',doc.summary.degraded],['Inconclusive',doc.summary.unknown]]){
  const box=element('div',stats,'stat');
  element('span',box,'',name);
  element('strong',box,'',count);
 }
 rows.textContent='';
 for(const c of doc.checks){
  const card=element('article',rows,'check');
  element('span',card,'pill '+(c.status==='pass'?'pass':'neutral'),labels[c.status]||'Unknown');
  element('h3',card,'',c.title);
  element('p',card,'route',c.method+' '+c.route+' · expected HTTP '+c.expectedHttp+' / observed '+(c.actualHttp??'not available'));
  element('p',card,'fine',c.explanation||'');
  if(c.quote)element('p',card,'quote',c.quote.priceUSDC+' native Circle Base USDC · '+c.quote.network+' · quote only');
 }
}
load();
