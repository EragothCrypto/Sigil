const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("manifest uses a main-world injector and isolated UI bridge", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const scripts = manifest.content_scripts || [];
  assert.equal(scripts.length, 2);
  assert.deepEqual(scripts[0].js, ["inject.js"]);
  assert.equal(scripts[0].world, "MAIN");
  assert.deepEqual(scripts[1].js, ["core.js", "content.js"]);
});

test("manifest uses minimum permissions for store submission", () => {
  const manifest = JSON.parse(read("manifest.json"));
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://sigil.s3ntrylabs.com/*"]);
  assert.equal(manifest.web_accessible_resources, undefined);
});

test("extension package does not load remote executable code", () => {
  const popup = read("popup.html");
  const files = ["popup.html", "popup.js", "content.js", "core.js", "inject.js", "background.js"];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /<script[^>]+src=["']https?:\/\//i, `${file} must not load remote scripts`);
    assert.doesNotMatch(source, /\beval\s*\(/, `${file} must not use eval`);
    assert.doesNotMatch(source, /new Function\s*\(/, `${file} must not compile dynamic code`);
  }
  assert.doesNotMatch(popup, /https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(popup, /https:\/\/fonts\.gstatic\.com/);
});

test("bridge uses request ids and fails closed on timeout", () => {
  const inject = read("inject.js");
  const content = read("content.js");
  assert.match(inject, /requestId/);
  assert.match(content, /requestId/);
  assert.match(inject, /Sigil security check timed out/);
  assert.doesNotMatch(inject, /Object\.defineProperty\s*=/);
  assert.doesNotMatch(content, /analysisInProgress[\s\S]*sigil:proceed[\s\S]*action:\s*"proceed"/);
});
