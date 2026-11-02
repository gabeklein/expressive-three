import type { Component } from '@expressive/mvc';

import groups from '../pages';

const manifests = import.meta.glob<{ default: string[] }>('../pages/*/index.ts', { eager: true });

export const Index = () => (
  <main className="index">
    <h1>Expressive Three</h1>
    <p>Each example is a page - open one to see it run, then read its source.</p>
    {groups.map((group) => (
      <section key={group}>
        <h2>{group}</h2>
        <ul>
          {manifests[`../pages/${group}/index.ts`].default.map((page) => (
            <li key={page}>
              <a href={`?page=${group}/${page}`}>{page}</a>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </main>
);

export const Shell = (props: { page: string; children: Component.Node }) => (
  <>
    <nav className="crumbs">
      <a href="/">Examples</a> / {props.page}
    </nav>
    {props.children}
  </>
);
