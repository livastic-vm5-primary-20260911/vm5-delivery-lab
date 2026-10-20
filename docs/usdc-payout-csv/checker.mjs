/* VM5 original, fully local and bounded Base USDC payee CSV preflight.
 * NO network access, uploads, signers, balances or on-chain verification. */
export const LIMITS=Object.freeze({bytes:65536,rows:500,columns:8,issues:80});
export const BASE_USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ADDR=/^0x[0-9a-fA-F]{40}$/;
const AMOUNT=/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,6})?$/;
const ZERO="0x"+"0".repeat(40);
export function parseCsv(original) {
  if(typeof original!=="string")throw Error("CSV must be text.");
  if(new TextEncoder().encode(original).length>LIMITS.bytes)throw Error("CSV exceeds the 64 KiB size limit.");
  const s=original.replace(/^\uFEFF/,"");
  if(!s.trim())throw Error("CSV is empty.");
  if(s.includes("\u0000"))throw Error("CSV contains unsupported NUL characters.");
  let cells=[],rows=[],field="",state="start";
  const addCell=()=>{
    cells.push(field);field="";state="start";
    if(cells.length>LIMITS.columns)throw Error("CSV has more than 8 columns.");
  };
  const addRow=()=>{
    addCell();rows.push(cells);cells=[];
    if(rows.length>LIMITS.rows+1)throw Error("CSV has more than 500 recipient rows.");
  };
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(state==="quoted"){
      if(c==='"'){
        if(s[i+1]==='"'){field+='"';i++;}
        else state="afterQuote";
      }else field+=c;
      continue;
    }
    if(c===","){addCell();continue;}
    if(c==="\n"||c==="\r"){
      addRow();if(c==="\r"&&s[i+1]==="\n")i++;
      continue;
    }
    if(state==="afterQuote")throw Error("Unexpected text after closing CSV quote, row "+(rows.length+1)+".");
    if(c==='"'){
      if(state!=="start")throw Error("Quote within an unquoted cell, row "+(rows.length+1)+".");
      state="quoted";
    }else{field+=c;state="bare";}
  }
  if(state==="quoted")throw Error("Unclosed quoted CSV field.");
  if(state!=="start"||field!==""||cells.length)addRow();
  if(!rows.length)throw Error("CSV is empty.");
  return rows;
}
function atomic(amount){
  const [int,frac=""]=amount.split(".");
  return BigInt(int)*1000000n+BigInt(frac.padEnd(6,"0"));
}
export function formatAtomic(n){
  if(typeof n!=="bigint"||n<0n)throw TypeError("Expected nonnegative atomic quantity.");
  const a=(n/1000000n).toString(), b=(n%1000000n).toString().padStart(6,"0").replace(/0+$/,"");
  return a+(b?"."+b:"");
}
export function evaluatePayoutCsv(input){
  const data=parseCsv(input), header=data[0].map(h=>h.trim().toLowerCase());
  const locations=new Map(), issues=[];
  let errorCount=0,warningCount=0;
  function add(severity,code,row,column,message){
    if(severity==="error")errorCount++; else warningCount++;
    if(issues.length<LIMITS.issues)issues.push({severity,code,row,column,message});
  }
  header.forEach((h,i)=>{
    if(!h||locations.has(h))add("error","HEADER_DUPLICATE_OR_EMPTY",1,i+1,"Header missing or duplicated (case-insensitive).");
    else locations.set(h,i);
    if(h&&!["address","amount","chain","token","memo"].includes(h))
      add("warning","UNRECOGNIZED_COLUMN",1,i+1,"Unknown column: ignored for payout checks.");
  });
  if(!locations.has("address"))add("error","ADDRESS_HEADER_MISSING",1,0,"Column 'address' is required.");
  if(!locations.has("amount"))add("error","AMOUNT_HEADER_MISSING",1,0,"Column 'amount' is required.");
  if(!locations.has("chain"))add("warning","CHAIN_ASSUMED",1,0,"No chain column. Base mainnet is assumed; not verified.");
  if(!locations.has("token"))add("warning","TOKEN_ASSUMED",1,0,"No token column. Canonical Circle Base USDC is assumed; not verified.");
  const prior=new Map();
  let safeRowCount=0, exactAtomic=0n;
  for(let i=1;i<data.length;i++){
    const row=data[i],displayRow=i+1;
    if(row.length!==header.length){
      add("error","RAGGED_ROW",displayRow,0,"Different number of cells than header.");
      continue;
    }
    if(!locations.has("address")||!locations.has("amount"))continue;
    let rowOkay=true;
    const addressColumn=locations.get("address"),amountColumn=locations.get("amount");
    const address=row[addressColumn].trim(),amount=row[amountColumn].trim();
    if(!ADDR.test(address)||address.toLowerCase()===ZERO){
      add("error","INVALID_ADDRESS",displayRow,addressColumn+1,"Nonzero EVM 0x + 40 hex characters required. Not a checksum/ownership proof.");
      rowOkay=false;
    }else{
      const key=address.toLowerCase();
      if(prior.has(key)){
        add("error","DUPLICATE_ADDRESS",displayRow,addressColumn+1,"Recipient duplicated (first seen in row "+prior.get(key)+"). Review before any payment.");
        rowOkay=false;
      }else prior.set(key,displayRow);
      if(/[a-f]/.test(address.slice(2))&&/[A-F]/.test(address.slice(2)))
        add("warning","CHECKSUM_NOT_VERIFIED",displayRow,addressColumn+1,"Mixed-case address has NOT been checksum-verified.");
    }
    if(!AMOUNT.test(amount)||BigInt(amount.split(".")[0]||"0")>1000000000n|| (AMOUNT.test(amount)&&atomic(amount)===0n)){
      add("error","INVALID_AMOUNT",displayRow,amountColumn+1,"Positive decimal USDC, maximum 6 fraction digits, up to 1 billion per recipient.");
      rowOkay=false;
    }
    if(locations.has("chain")&&!["base","8453","eip155:8453"].includes(row[locations.get("chain")].trim().toLowerCase())){
      add("error","WRONG_CHAIN",displayRow,locations.get("chain")+1,"This tool only reviews Base chain 8453.");
      rowOkay=false;
    }
    if(locations.has("token")&&!["usdc",BASE_USDC].includes(row[locations.get("token")].trim().toLowerCase())){
      add("error","WRONG_TOKEN",displayRow,locations.get("token")+1,"Expected canonical Circle USDC on Base.");
      rowOkay=false;
    }
    row.forEach((v,j)=>{
      if(j===amountColumn) return;
      if(/^[=+\-@]/.test(v.trimStart()))
        add("warning","FORMULA_LIKE_CELL",displayRow,j+1,"Formula-like prefix; sanitize before exporting to Sheets/Excel.");
    });
    if(rowOkay){safeRowCount++;exactAtomic+=atomic(amount);}
  }
  return {
    schema:"vm5-local-usdc-csv-preflight-v1",
    inspectedRows:data.length-1,
    acceptedSyntaxRows:safeRowCount,
    errorCount,warningCount,totalIssueCount:errorCount+warningCount,
    issues,issuesTruncated:errorCount+warningCount>issues.length,
    validRowsPartialTotalUSDC:formatAtomic(exactAtomic),
    warning:"Syntax-only. No recipient ownership, blacklist, EIP-55 checksum, chain balance, transfer simulation or settlement checked. NEVER sign or send payments based only on this output.",
    network:"eip155:8453",token:BASE_USDC,
    uploaded:false,signed:false,transferred:false,clientOnly:true
  };
}
export const SYNTHETIC_SAMPLE=[
 "address,amount,chain,token,memo",
 "0x1111111111111111111111111111111111111111,4.500000,Base,USDC,synthetic demo only",
 "0x2222222222222222222222222222222222222222,0,Base,USDC,zero amount",
 "0x1111111111111111111111111111111111111111,2.25,Base,USDC,duplicate",
 "0x3333333333333333333333333333333333333333,1.250001,eip155:1,USDC,wrong chain",
 '0x4444444444444444444444444444444444444444,2.2,8453,USDC,"=HYPERLINK(""example"")"'
].join("\r\n");
