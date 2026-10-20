const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const filename = path.join(__dirname, "..", "lib", "divination.ts");
const source = fs.readFileSync(filename, "utf8");
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const errors = (diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, "Could not transpile lib/divination.ts");
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(outputText, filename);
const divination = loaded.exports;

function withRandomValues(values, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues(buffer) {
        const next = values.shift();
        assert.notEqual(next, undefined, "unexpected extra random draw");
        buffer[0] = next;
        return buffer;
      },
    },
  });
  try {
    return callback();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    else delete globalThis.crypto;
  }
}

test("randomInteger validates bounds and rejects the biased tail of the uint32 range", () => {
  assert.throws(() => divination.randomInteger(0), /随机范围无效/);
  assert.throws(() => divination.randomInteger(1.5), /随机范围无效/);
  assert.throws(() => divination.randomInteger(0x100000001), /随机范围无效/);
  assert.equal(withRandomValues([0xffffffff, 5], () => divination.randomInteger(3)), 2);
});

test("cup faces map consistently to the three labeled outcomes", () => {
  const cases = [
    { values: [1, 0], faces: ["平面", "凸面"], result: "圣筊" },
    { values: [1, 1], faces: ["平面", "平面"], result: "笑筊" },
    { values: [0, 0], faces: ["凸面", "凸面"], result: "阴筊" },
  ];
  for (const item of cases) {
    assert.deepEqual(withRandomValues([...item.values], () => divination.tossCup()), {
      faces: item.faces,
      result: item.result,
    });
  }
});

test("all three-coin outcomes agree with the configured 3/2 line values", () => {
  const observedLines = new Set();
  for (let mask = 0; mask < 8; mask += 1) {
    const coins = [0, 1, 2].map((index) => Boolean(mask & (1 << index)));
    const values = coins.map((heads) => heads ? 1 : 0);
    const thrown = withRandomValues(values, () => divination.tossCoinThrow());
    const expectedLine = coins.reduce((sum, heads) => sum + (heads ? 3 : 2), 0);
    assert.deepEqual(thrown.coins, coins);
    assert.equal(thrown.line, expectedLine);
    observedLines.add(thrown.line);
  }
  assert.deepEqual([...observedLines].sort(), [6, 7, 8, 9]);
});

test("the 64 non-moving line combinations resolve to 64 distinct hexagrams", () => {
  const names = new Set();
  for (let mask = 0; mask < 64; mask += 1) {
    const lines = Array.from({ length: 6 }, (_, index) => mask & (1 << index) ? 7 : 8);
    const result = divination.resolveHexagram(lines);
    assert.ok(result, `unresolved line combination ${mask}`);
    assert.equal(result.current.number, result.changed.number);
    assert.deepEqual(result.movingLines, []);
    names.add(result.current.number);
  }
  assert.equal(names.size, 64);
  assert.equal(divination.resolveHexagram([7, 8, 9, 6, 7, 8]).current.name, "水火既济");
  const changing = divination.resolveHexagram([7, 8, 9, 6, 7, 8]);
  assert.equal(changing.changed.name, "泽雷随");
  assert.deepEqual(changing.movingLines, [3, 4]);
  assert.equal(divination.resolveHexagram([7, 7, 7, 7, 7]), null);
});
