import type { Component } from '@expressive/mvc';
import { render } from '@expressive/dom';
import { jsx } from '@expressive/dom/jsx-runtime';

import { Index, Shell } from './Shell';

const pages = import.meta.glob<{ default: () => Component.Node }>('../pages/*/*/App.tsx');
const page = new URLSearchParams(location.search).get('page');
const root = document.getElementById('root')!;

if (page) {
  const load = pages[`../pages/${page}/App.tsx`];

  if (!load) throw new Error(`No example at ${page}.`);

  const { default: App } = await load();

  render(jsx(Shell, { page, children: jsx(App, {}) }), root);
} else render(jsx(Index, {}), root);
