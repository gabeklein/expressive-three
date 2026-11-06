import { Component } from '@expressive/mvc';
import { get, Pointer } from '@expressive/three';

import type { Crate } from './App';

export class Inspector extends Component {
  pointer = get(Pointer);

  render() {
    const { hit, point, pressed } = this.pointer;
    const crate = hit as Crate | undefined;

    if (crate)
      return (
        <dl className="inspector">
          <dt>hit</dt>
          <dd className="hit">{crate.label}</dd>
          <dt>focus</dt>
          <dd className="focus">{crate.focus ? 'yes' : 'no'}</dd>
          <dt>spinning</dt>
          <dd className="spinning">{crate.spinning ? 'yes' : 'no'}</dd>
          <dt>charging</dt>
          <dd className="charging">{crate.charging ? 'yes' : 'no'}</dd>
          <dt>point</dt>
          <dd>{point!.toArray().map((n) => n.toFixed(2)).join(', ')}</dd>
          <dt>pressed</dt>
          <dd className="pressed">{pressed ? 'yes' : 'no'}</dd>
        </dl>
      );

    return <p className="inspector hit">Nothing under the pointer.</p>;
  }
}
