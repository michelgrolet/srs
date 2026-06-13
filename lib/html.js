// Bind htm to Preact's hyperscript once, share the `html` tag everywhere.
// We use htm tagged templates instead of JSX so there is no build step (ADR-0003).
import { h } from 'preact';
import htm from 'htm';

export const html = htm.bind(h);
export { h };
