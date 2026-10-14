// Renders README.md into dist/index.html next to the likec4 build in dist/diagrams/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { marked } from 'marked';

const markdown = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const body = marked.parse(markdown, { gfm: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Solana developer onboarding: the C4 model of the Zama protocol</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 56rem; margin: 2rem auto; padding: 0 1rem; font: 16px/1.55 system-ui, sans-serif; }
  code, pre { font: 0.9em ui-monospace, SFMono-Regular, Menlo, monospace; }
  pre { padding: 0.75rem 1rem; overflow-x: auto; background: rgba(127,127,127,0.12); border-radius: 6px; }
  code { background: rgba(127,127,127,0.12); padding: 0.1em 0.3em; border-radius: 3px; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 0.92em; }
  th, td { border: 1px solid rgba(127,127,127,0.4); padding: 0.4rem 0.6rem; vertical-align: top; text-align: left; }
  li.task-list-item { list-style: none; margin-left: -1.4rem; }
  a { color: #2a6fdb; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

await mkdir(new URL('../dist', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/index.html', import.meta.url), html);
console.log('dist/index.html written');
