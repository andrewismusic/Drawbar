// Writes the page as published to the claude.ai artifact: index.html without its own doctype/html/head/body
// wrapper and charset/viewport metas (the artifact host adds those). Everything under src/ is published beside it.
// Run: node tools/artifact-page.mjs <out.html>
import fs from 'fs';
const out = process.argv[2];
if (!out) { console.error('Usage: node tools/artifact-page.mjs <out.html>'); process.exit(1); }
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  .split('\n')
  .filter(l => !/^<!doctype html>$|^<\/?html|^<\/?head>$|^<\/?body>$|<meta charset|<meta name="viewport"/i.test(l.trim()))
  .join('\n');
fs.writeFileSync(out, html);
console.log('wrote', out);
