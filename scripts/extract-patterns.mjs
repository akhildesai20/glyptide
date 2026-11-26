
import fs from 'fs';
const html = fs.readFileSync('text-in-motion-v5.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Evaluate just the data portion in a sandbox
const dataEnd = script.indexOf('// Engine is intentionally');
const dataCode = script.slice(0, dataEnd);

const sandbox = { cases: null, structuredSamples: null, structuredGroups: null };
const fn = new Function('exports', dataCode + `
  exports.cases = cases;
  exports.structuredSamples = structuredSamples;
  exports.structuredGroups = structuredGroups;
`);
const exports = {};
fn(exports);

const patterns = [];
for (const c of exports.cases) {
  c.patterns.forEach((p, i) => {
    const id = (c.id + '-' + p[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''));
    patterns.push({
      id,
      caseId: c.id,
      name: p[0],
      kind: p[1],
      effect: p[2],
      description: p[3],
      index: i,
      group: c.id === 'structured' ? exports.structuredGroups[i] : null,
      sample: c.id === 'structured' ? exports.structuredSamples[i] : c.text,
      source: c.source,
    });
  });
}

const casesMeta = exports.cases.map(c => ({
  id: c.id,
  title: c.title,
  desc: c.desc,
  surface: c.surface,
  source: c.source,
  text: c.text,
}));

fs.writeFileSync('packages/glyptide/src/data/cases.json', JSON.stringify(casesMeta, null, 2));
fs.writeFileSync('packages/glyptide/src/data/patterns.json', JSON.stringify(patterns, null, 2));
fs.writeFileSync('packages/glyptide/src/data/structured-samples.json', JSON.stringify(exports.structuredSamples, null, 2));
fs.writeFileSync('packages/glyptide/src/data/structured-groups.json', JSON.stringify(exports.structuredGroups, null, 2));
console.log('Extracted', patterns.length, 'patterns');
