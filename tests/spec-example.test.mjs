import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {auditOpenApiText} from "../docs/api-preflight/engine.mjs";

const spec = JSON.parse(fs.readFileSync(new URL("../examples/jsonplaceholder.openapi.json",import.meta.url),"utf8"));
const evidence = JSON.parse(fs.readFileSync(new URL("../evidence/jsonplaceholder-http-20261017.json",import.meta.url),"utf8"));
const ops = Object.values(spec.paths).flatMap(p=>Object.entries(p).filter(([k])=>new Set(["get","post","put","patch","delete"]).has(k)).map(([method,doc])=>({method,...doc})));
function response(code){return evidence.checks.find(x=>x.name===code);}
test("independent spec is OpenAPI 3.0 and explicitly identifies the mock API",()=>{
  assert.equal(spec.openapi,"3.0.3");
  assert.match(spec.info.title,/independently verified/i);
  assert.match(spec.info.description,/does not permanently save/i);
  assert.equal(spec.servers[0].url,"https://jsonplaceholder.typicode.com");
});
test("source preflight finds no errors/warnings in the canonical JSON",()=>{
 const result=auditOpenApiText(JSON.stringify(spec));
 assert.equal(result.summary.errors,0);
 assert.equal(result.summary.warnings,0);
 assert.equal(result.summary.notes,0);
 assert.equal(result.summary.paths,2);
 assert.equal(result.summary.operations,3);
});
test("each operation has a distinct name and a successful documented status",()=>{
 assert.equal(ops.length,3);
 assert.equal(new Set(ops.map(x=>x.operationId)).size,3);
 for(const op of ops)assert.ok(Object.keys(op.responses).some(x=>/^2\d\d$/.test(x)));
});
test("GET /posts response shape is an array of Post refs",()=>{
 const schema=spec.paths["/posts"].get.responses["200"].content["application/json"].schema;
 assert.equal(schema.type,"array");
 assert.equal(schema.items.$ref,"#/components/schemas/Post");
});
test("GET /posts/{id} declares a required positive integer path parameter",()=>{
 const params=spec.paths["/posts/{id}"].get.parameters;
 assert.equal(params.length,1);
 assert.equal(params[0].name,"id");
 assert.equal(params[0].required,true);
 assert.equal(params[0].in,"path");
 assert.equal(params[0].schema.minimum,1);
});
test("GET /posts/{id} handles the observed 404 empty-object response",()=>{
 const op=spec.paths["/posts/{id}"].get;
 assert.ok(op.responses["404"]);
 assert.deepEqual(op.responses["404"].content["application/json"].example,{});
 assert.equal(response("missing").http,404);
 assert.deepEqual(response("missing").response,{});
});
test("POST /posts is documented as simulated, not persistent",()=>{
 const op=spec.paths["/posts"].post;
 assert.match(op.description,/no persistent record is created/i);
 assert.equal(op.requestBody.required,true);
 assert.equal(op.responses["201"].content["application/json"].schema.$ref,"#/components/schemas/Post");
 assert.equal(response("simulate_create").http,201);
});
test("sample schema exposes observed post field names",()=>{
 const post=spec.components.schemas.Post;
 const input=spec.components.schemas.PostCreate;
 const observed=response("read").response;
 assert.deepEqual(Object.keys(observed).sort(),["body","id","title","userId"]);
 assert.deepEqual(Object.keys(input.properties).sort(),["body","title","userId"]);
 assert.deepEqual(post.allOf[1].required,["id"]);
 assert.equal(observed.id,1);
});
test("GET /posts list count and HTTP status match captured public observation",()=>{
 assert.equal(response("list").http,200);
 assert.equal(response("list").arrayCount,100);
 assert.deepEqual(Object.keys(response("list").sample).sort(),["body","id","title","userId"]);
});
test("no credential, keys, PII or private host is embedded in sample spec",()=>{
 assert.equal(spec.security.length,0);
 assert.ok(!JSON.stringify(spec).includes("Bearer "));
 assert.ok(!JSON.stringify(spec).includes("localhost"));
 assert.ok(!JSON.stringify(spec).includes("api_key"));
});
