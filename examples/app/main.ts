import type { Component } from '@expressive/mvc';
import { render } from '@expressive/dom';
import { jsx } from '@expressive/dom/jsx-runtime';

import { Index, Shell } from './Shell';

const pages = import.meta.glob<{ default: () => Component.Node }>('../pages/*/*/App.tsx');
const sources = import.meta.glob<string>(['../pages/*/*/*.{ts,tsx}', '!../pages/*/*/*.spec.ts'], {
  query: '?raw',
  import: 'default'
});
const page = new URLSearchParams(location.search).get('page');
const root = document.getElementById('root')!;

if (page) {
  const load = pages[`../pages/${page}/App.tsx`];

  if (!load) throw new Error(`No example at ${page}.`);

  const folder = `../pages/${page}/`;
  const files = Object.keys(sources)
    .filter((path) => path.startsWith(folder))
    .map((path) => path.slice(folder.length))
    .sort((a, b) => Number(b == 'App.tsx') - Number(a == 'App.tsx') || a.localeCompare(b));

  const [{ default: App }, ...code] = await Promise.all([load(), ...files.map((name) => sources[folder + name]())]);
  const source = files.map((name, i) => ({ name, code: code[i] }));

  render(jsx(Shell, { page, source, children: jsx(App, {}) }), root);
} else render(jsx(Index, {}), root);
