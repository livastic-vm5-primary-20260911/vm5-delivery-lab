// VM5 Delivery Lab • Offline OpenAPI 3.x contract preflight.
// Pure static analysis of JSON. Never makes network calls or executes the input.
// This is a heuristic developer preflight, not a security certification.
const METHODS = new Set(["get","put","post","delete","options","head","patch","trace"]);
const MUTATIONS = new Set(["post","put","patch","delete"]);
const MAX_CHARS = 750000;
const MAX_NODES = 40000;
const MAX_OPERATIONS = 2000;
const isObject = x => x !== null && typeof x === "object" && !Array.isArray(x);
const pointerEscape = x => String(x).replaceAll("~","~0").replaceAll("/","~1");
const pointer = (...segments) => "#/"+segments.map(pointerEscape).join("/");
const humanMethod = m => String(m).toUpperCase();

function localRefExists(doc, ref) {
  if (ref === "#") return true;
  if (!ref.startsWith("#/")) return false;
  let target=doc;
  for (const segment of ref.slice(2).split("/")) {
    const key=segment.replace(/~1/g,"/").replace(/~0/g,"~");
    if ((typeof target!=="object" || target===null) || !Object.prototype.hasOwnProperty.call(target,key)) return false;
    target=target[key];
  }
  return true;
}
function collectRefs(doc, push) {
  const stack=[{value:doc,at:"#"}];
  let inspected=0, external=0;
  while(stack.length) {
    if(++inspected > MAX_NODES) {
      push("warning","ANALYSIS_LIMIT","#","Stopped recursive reference checking after "+MAX_NODES+" JSON nodes.","Split very large definitions into separate files and review manually.");
      break;
    }
    const {value,at}=stack.pop();
    if(!value || typeof value!=="object") continue;
    if(Array.isArray(value)) {
      for(let i=value.length-1;i>=0;i--) stack.push({value:value[i],at:at+"/"+i});
      continue;
    }
    for (const [key,next] of Object.entries(value)) {
      if (key==="$ref" && typeof next==="string") {
        if(next.startsWith("#")) {
          if(!localRefExists(doc,next)) push("error","BROKEN_REFERENCE",at+"/$ref","Local reference "+next+" cannot be resolved.","Check the JSON pointer and make sure the component exists.");
        } else {
          external++;
        }
      } else if(next!==null && typeof next==="object") {
        stack.push({value:next,at:at+"/"+pointerEscape(key)});
      }
    }
  }
  if(external)push("note","EXTERNAL_REFERENCE","#","Found "+external+" external reference(s) that were intentionally not fetched.","Verify external references using your own authorized development tools.");
}
function checkParameters(params,route,method,at,push) {
  if(params===undefined)return;
  if(!Array.isArray(params)){
    push("error","INVALID_PARAMETERS",at,"Parameters must be an array.","Use an array of parameter objects or component references.");
    return;
  }
  const seen=new Set();
  for(let i=0;i<params.length;i++){
    const p=params[i],where=at+"/"+i;
    if(!isObject(p)) {
      push("error","INVALID_PARAMETER",where,"Parameter entry must be an object.","Provide name, in, and schema fields.");
      continue;
    }
    if(typeof p.$ref==="string")continue;
    if(typeof p.name!=="string" || typeof p.in!=="string"){
      push("error","PARAMETER_IDENTITY",where,"Parameter is missing its name or in location.","Declare a named path, query, header or cookie parameter.");
      continue;
    }
    const k=p.in+":"+p.name;
    if(seen.has(k))push("warning","DUPLICATE_PARAMETER",where,"Duplicate "+p.in+" parameter "+p.name+".","Keep one definition per name/location pair.");
    seen.add(k);
    if(p.in==="path" && p.required!==true){
      push("error","OPTIONAL_PATH_PARAMETER",where,"Path parameter "+p.name+" must be required.","Set required: true for every path parameter.");
    }
    if(!p.schema && !p.content)push("warning","PARAMETER_SCHEMA_MISSING",where,"Parameter "+p.name+" has no schema or content.","Declare a type schema or media content.");
  }
}
function normalizeParams(a,b,doc) {
  return [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].map(p=>{
    if(!isObject(p)) return null;
    if(typeof p.$ref==="string" && p.$ref.startsWith("#/")) {
      let target=doc;
      for(const seg of p.$ref.slice(2).split("/")){
        const key=seg.replace(/~1/g,"/").replace(/~0/g,"~");
        if(target==null||!Object.prototype.hasOwnProperty.call(target,key))return null;
        target=target[key];
      }
      return isObject(target)?target:null;
    }
    return p;
  }).filter(isObject);
}
function responseIsSuccess(code){return /^(2|3)([0-9]{2}|XX)$/i.test(code)}
function isValidResponseCode(code){return code==="default"||/^[1-5]([0-9]{2}|XX)$/i.test(code)}

export function auditOpenApiText(text) {
  const issues=[];
  function push(severity,code,where,message,fix){
    if(issues.length<1600)issues.push({severity,code,where,message,fix});
  }
  if(typeof text!=="string") {
    push("error","INPUT_NOT_TEXT","#","Supply a JSON string.","Paste an OpenAPI 3.x JSON document.");
    return wrap();
  }
  if(text.length>MAX_CHARS){
    push("error","TOO_LARGE","#","This browser preflight limits input to "+MAX_CHARS.toLocaleString("en-US")+" characters.","Use smaller scoped specifications or a local CLI validator.");
    return wrap();
  }
  if(!text.trim()){
    push("error","EMPTY","#","No OpenAPI JSON provided.","Paste a JSON document or load the demo example.");
    return wrap();
  }
  let doc;
  try{doc=JSON.parse(text)}catch(err){
    push("error","INVALID_JSON","#","Cannot parse JSON: "+String(err.message||"invalid JSON").slice(0,240),"Export a valid JSON document from your OpenAPI authoring tool.");
    return wrap();
  }
  if(!isObject(doc)){
    push("error","ROOT_OBJECT","#","The OpenAPI document root must be an object.","Start with openapi, info and paths keys.");
    return wrap();
  }
  if(!/^3\.(0|1)\.[0-9]+$/.test(doc.openapi||"")){
    push("error","OPENAPI_VERSION","#/openapi","This tool only supports OpenAPI 3.0.x and 3.1.x JSON.","Migrate Swagger 2.0 or another format using your own authorized tooling.");
  }
  if(!isObject(doc.info)){
    push("error","INFO_MISSING","#/info","An info object is required.","Include title and version.");
  } else {
    if(typeof doc.info.title!=="string"||!doc.info.title.trim())push("error","TITLE_MISSING","#/info/title","API info.title is missing.","Provide a descriptive API title.");
    if(typeof doc.info.version!=="string"||!doc.info.version.trim())push("error","VERSION_MISSING","#/info/version","API info.version is missing.","Declare the API's version string.");
  }
  if(!isObject(doc.paths) || Object.keys(doc.paths).length===0){
    push("error","PATHS_MISSING","#/paths","No paths were found.","Declare at least one path with a documented operation.");
    return wrap(doc);
  }
  const ids=new Map();
  let operationCount=0;
  let pathCount=0;
  for (const [route,item] of Object.entries(doc.paths)) {
    const at=pointer("paths",route);
    pathCount++;
    if(!route.startsWith("/"))push("error","BAD_PATH",at,"Path "+route+" must start with /.","Prefix OpenAPI routes with /.");
    if(!isObject(item)){
      push("error","INVALID_PATH_ITEM",at,"Path item must be an object.","Define HTTP methods as objects.");
      continue;
    }
    if(item.$ref && typeof item.$ref==="string")continue;
    checkParameters(item.parameters,route,null,at+"/parameters",push);
    const methods=Object.entries(item).filter(([method])=>METHODS.has(method.toLowerCase()));
    if(!methods.length)push("warning","NO_METHODS",at,"No HTTP operations are defined for this path.","Define at least one GET, POST, PUT, PATCH, DELETE, HEAD or OPTIONS operation.");
    for(const [method,op] of methods){
      operationCount++;
      const loc=at+"/"+pointerEscape(method);
      if(operationCount>MAX_OPERATIONS){push("warning","OPERATION_LIMIT",loc,"Reached inspection limit of "+MAX_OPERATIONS+" operations.","Audit remaining methods separately.");break}
      if(!isObject(op)){
        push("error","INVALID_OPERATION",loc,"HTTP operation must be an object.","Add responses and a description.");
        continue;
      }
      if(!op.operationId){
        push("warning","OPERATION_ID_MISSING",loc,humanMethod(method)+" "+route+" has no operationId.","Add a unique operationId to improve SDK generation and tracing.");
      } else if(typeof op.operationId!=="string"){
        push("error","OPERATION_ID_TYPE",loc+"/operationId","operationId must be a string.","Provide a unique string identifier.");
      } else if(ids.has(op.operationId)){
        push("warning","DUPLICATE_OPERATION_ID",loc+"/operationId","operationId "+op.operationId+" is also used at "+ids.get(op.operationId)+".","Assign a unique ID to each operation.");
      } else ids.set(op.operationId,humanMethod(method)+" "+route);
      if(!op.summary && !op.description)push("note","DESCRIPTION_MISSING",loc,humanMethod(method)+" "+route+" has no summary or description.","Add a concise purpose and expected behavior.");
      checkParameters(op.parameters,route,method,loc+"/parameters",push);
      const combined=normalizeParams(item.parameters,op.parameters,doc);
      const names=[...route.matchAll(/\{([^{}]+)\}/g)].map(x=>x[1]);
      for(const name of names){
        const matches=combined.filter(p=>p.in==="path"&&p.name===name);
        if(matches.length===0)push("error","PATH_PARAM_MISSING",loc,"Path placeholder {"+name+"} has no matching path parameter.","Declare in:path, name:"+name+", required:true.");
      }
      if(MUTATIONS.has(method.toLowerCase())&&!Object.prototype.hasOwnProperty.call(op,"security")&&!Object.prototype.hasOwnProperty.call(doc,"security")){
        push("note","SECURITY_UNSPECIFIED",loc,humanMethod(method)+" "+route+" does not declare authentication in the OpenAPI document.","Confirm whether this operation is intentionally public; this is not proof of a vulnerability.");
      }
      if((method.toLowerCase()==="get"||method.toLowerCase()==="head") && op.requestBody){
        push("warning","BODY_ON_READ_METHOD",loc+"/requestBody",humanMethod(method)+" requests with bodies may not be interoperable.","Consider query or path parameters instead.");
      }
      const responses=op.responses;
      if(!isObject(responses) || Object.keys(responses).length===0){
        push("error","RESPONSES_MISSING",loc+"/responses","Operation has no responses object.","Document success and failure responses.");
      } else {
        const codes=Object.keys(responses);
        if(!codes.some(responseIsSuccess))push("warning","SUCCESS_RESPONSE_MISSING",loc+"/responses","No success response (2xx/3xx) is documented.","Document the expected successful status or explain why none applies.");
        for(const [status,obj] of Object.entries(responses)) {
          const resp=loc+"/responses/"+pointerEscape(status);
          if(!isValidResponseCode(status))push("warning","STATUS_CODE_INVALID",resp,"Response status "+status+" is not a standard OpenAPI response key.","Use a three-digit status, 2XX-style range or default.");
          if(!isObject(obj)){
            push("error","RESPONSE_NOT_OBJECT",resp,"Response definition must be an object.","Supply description and optional content.");
          } else if(!obj.$ref && typeof obj.description!=="string"){
            push("error","RESPONSE_DESCRIPTION_MISSING",resp,"Response lacks its required description.","Supply a brief description, even for no-content status codes.");
          }
        }
      }
    }
  }
  collectRefs(doc,push);
  return wrap(doc,pathCount,operationCount);

  function wrap(document=null,paths=0,operations=0){
    const counts={errors:0,warnings:0,notes:0};
    for(const finding of issues)counts[finding.severity==="error"?"errors":finding.severity==="warning"?"warnings":"notes"]++;
    return {summary:{...counts,paths,operations,inspectedAtUTC:"user device",jsonParsed:document!==null},issues};
  }
}

export const DEMO_SPEC = JSON.stringify({
  openapi:"3.1.0",
  info:{title:"Warehouse API",version:"1.0.0"},
  paths:{
    "/items/{itemId}":{
      get:{operationId:"getItem",responses:{"200":{content:{"application/json":{schema:{$ref:"#/components/schemas/Item"}}}}}},
      patch:{operationId:"getItem",requestBody:{content:{"application/json":{schema:{$ref:"#/components/schemas/MissingItemPatch"}}}},responses:{"204":{description:"Item updated"}}}
    },
    "/health":{get:{summary:"Read service health",responses:{"200":{description:"Healthy"}}}}
  },
  components:{schemas:{Item:{type:"object",properties:{id:{type:"string"}}}}}
},null,2);
