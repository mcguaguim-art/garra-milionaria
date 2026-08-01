import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const outputRoot = new URL("../public-web/", import.meta.url);

test("gera a entrada pública da Garra Milionária", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /lang="pt-BR"/);
  assert.match(html, /<title>Garra Milionária<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /assets\/index-[^"']+\.js/);
  assert.match(html, /assets\/index-[^"']+\.css/);
});

test("inclui os recursos necessários para as máquinas", async () => {
  const assets = await readdir(new URL("assets/", outputRoot));

  assert.ok(assets.some((name) => /^index-.*\.js$/.test(name)));
  assert.ok(assets.some((name) => /^rapier-.*\.js$/.test(name)));
  await access(new URL("prizes/calibrated/iphone14.png", outputRoot));
  await access(new URL("claw-v2/parts-sheet.png", outputRoot));
  await access(new URL("models/prizes/iphone.glb", outputRoot));
});
