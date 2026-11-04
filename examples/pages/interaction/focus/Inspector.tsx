import { Component } from '@expressive/mvc';
import { Focus, get } from '@expressive/three';

import type { Crate } from './App';

export class Inspector extends Component {
  focus = get(Focus);

  render() {
    const { hit, point, pressed } = this.focus;
    const crate = hit as Crate | undefined;

    if (crate)
      return (
        <dl className="inspector">
          <dt>hit</dt>
          <dd className="hit">{crate.label}</dd>
          <dt>focused</dt>
          <dd className="focused">{crate.focused ? 'yes' : 'no'}</dd>
          <dt>spinning</dt>
          <dd className="spinning">{crate.spinning ? 'yes' : 'no'}</dd>
          <dt>point</dt>
          <dd>{point!.toArray().map((n) => n.toFixed(2)).join(', ')}</dd>
          <dt>pressed</dt>
          <dd>{pressed ? 'yes' : 'no'}</dd>
        </dl>
      );

    return <p className="inspector hit">Nothing in focus.</p>;
  }
}
