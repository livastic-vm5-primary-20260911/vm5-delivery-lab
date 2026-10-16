import test from "node:test";
import assert from "node:assert/strict";
import {auditOpenApiText, DEMO_SPEC} from "../docs/api-preflight/engine.mjs";

function sample() {
  return {
    openapi: "3.1.0",
    info: {title:"Example",version:"1.0"},
    security:[],
    paths: {
      "/users/{id}":{
        get:{
          operationId:"getUser",summary:"Read a user",
          parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],
          responses:{"200":{description:"OK",content:{"application/json":{schema:{$ref:"#/components/schemas/User"}}}}}
        }
      }
    },
    components:{schemas:{User:{type:"object"}}}
  };
}
const run = obj => auditOpenApiText(JSON.stringify(obj));
const has = (r,code) => r.issues.some(issue => issue.code === code);

test("valid OpenAPI document",()=>{
  const result=run(sample());
  assert.equal(result.summary.errors,0);
  assert.equal(result.summary.warnings,0);
  assert.equal(result.summary.operations,1);
});
test("3.0 supported, 2.0 rejected",()=>{
  const x=sample();x.openapi="3.0.3";
  assert.equal(run(x).summary.errors,0);
  x.openapi="2.0";
  assert.ok(has(run(x),"OPENAPI_VERSION"));
});
test("no input and invalid JSON report errors",()=>{
  assert.ok(has(auditOpenApiText(""),"EMPTY"));
  assert.ok(has(auditOpenApiText("{ broken"),"INVALID_JSON"));
});
test("large JSON input is bounded",()=>assert.ok(has(auditOpenApiText("x".repeat(750001)),"TOO_LARGE")));
test("non-object root and missing paths",()=>{
  assert.ok(has(auditOpenApiText("[1,2]"),"ROOT_OBJECT"));
  const x=sample();delete x.paths;
  assert.ok(has(run(x),"PATHS_MISSING"));
});
test("mandatory title and version",()=>{
  const x=sample();x.info={};
  assert.ok(has(run(x),"TITLE_MISSING"));
  assert.ok(has(run(x),"VERSION_MISSING"));
});
test("bad route and missing path parameter",()=>{
  const x=sample();x.paths={"users/{id}":x.paths["/users/{id}"]};
  delete x.paths["users/{id}"].get.parameters;
  assert.ok(has(run(x),"BAD_PATH"));
  assert.ok(has(run(x),"PATH_PARAM_MISSING"));
});
test("path parameters are required",()=>{
  const x=sample();x.paths["/users/{id}"].get.parameters[0].required=false;
  assert.ok(has(run(x),"OPTIONAL_PATH_PARAMETER"));
});
test("missing response and description",()=>{
  const x=sample(),op=x.paths["/users/{id}"].get;
  delete op.responses;
  assert.ok(has(run(x),"RESPONSES_MISSING"));
  op.responses={"200":{}};
  assert.ok(has(run(x),"RESPONSE_DESCRIPTION_MISSING"));
});
test("duplicate operation identifier",()=>{
  const x=sample();x.paths["/health"]={get:{operationId:"getUser",summary:"Health",responses:{"200":{description:"OK"}}}};
  assert.ok(has(run(x),"DUPLICATE_OPERATION_ID"));
});
test("local and external references",()=>{
  const x=sample(),op=x.paths["/users/{id}"].get;
  op.responses["200"].content["application/json"].schema={$ref:"#/components/schemas/NotFound"};
  assert.ok(has(run(x),"BROKEN_REFERENCE"));
  op.responses["200"].content["application/json"].schema={$ref:"https://example.org/public-schema.json"};
  assert.ok(has(run(x),"EXTERNAL_REFERENCE"));
});
test("undocumented security is only a note",()=>{
  const x=sample();delete x.security;
  x.paths["/users/{id}"].post={operationId:"createUser",summary:"Create",parameters:[{name:"id",in:"path",required:true,schema:{type:"string"}}],responses:{"201":{description:"Created"}}};
  const r=run(x);
  assert.ok(has(r,"SECURITY_UNSPECIFIED"));
  assert.equal(r.summary.errors,0);
});
test("read method body warns",()=>{
  const x=sample();x.paths["/users/{id}"].get.requestBody={description:"body"};
  assert.ok(has(run(x),"BODY_ON_READ_METHOD"));
});
test("demo example flags concrete issues and supplies guidance",()=>{
  const x=auditOpenApiText(DEMO_SPEC);
  assert.ok(has(x,"DUPLICATE_OPERATION_ID"));
  assert.ok(has(x,"BROKEN_REFERENCE"));
  for(const issue of x.issues){
    assert.ok(issue.where.startsWith("#"));
    assert.ok(issue.fix.length>=3);
  }
});

test("local parameter reference satisfies path placeholder",()=>{
  const x=sample();
  x.components.parameters={UserId:{in:"path",name:"id",required:true,schema:{type:"string"}}};
  x.paths["/users/{id}"].get.parameters=[{$ref:"#/components/parameters/UserId"}];
  const result=run(x);
  assert.ok(!has(result,"PATH_PARAM_MISSING"));
  assert.ok(!has(result,"BROKEN_REFERENCE"));
});
test("operation parameter safely overrides shared path parameter",()=>{
  const x=sample(), item=x.paths["/users/{id}"];
  item.parameters=item.get.parameters;
  item.get.parameters=[{in:"path",name:"id",required:true,schema:{type:"integer"}}];
  const result=run(x);
  assert.ok(!has(result,"PATH_PARAM_MISSING"));
  assert.ok(!has(result,"PATH_PARAM_DUPLICATE"));
});
