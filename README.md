# font-probe

Browser font probing utility that uses canvas typography signatures to estimate whether a requested font is actually rendering.

## Install

```bash
npm install font-probe
```

## Usage

```ts
import { FontProbe } from "font-probe";

new FontProbe();

const stack = 'Inter, "Segoe UI", Arial, sans-serif';
const candidates = FontProbe.splitFontFamilyList(stack);

for (const name of candidates) {
  const signal = FontProbe.getFontDistinctSignal(name);
  console.log(name, signal.label);
}
```

Possible labels:

- `available`
- `generic`
- `not rendering`
- `not found`

## Ready example

```bash
npm run example
```

Then open the URL printed by `http-server` (usually `http://127.0.0.1:8080`) and use `index.html`.

Do not open `index.html` directly with `file://` from desktop: browsers block module loading there and you'll see CORS/module errors.

If using VS Code Live Server:

1. Run `npm run build` first (so `dist/` exists).
2. Start Live Server from the project root.
3. Open `/index.html` via `http://127.0.0.1:<port>/index.html`.

The example page:

- accepts a comma-separated list of font names,
- applies that full list to preview text,
- probes every candidate with `FontProbe`,
- groups output into `available` (with text samples) and `others` (`generic`, `not rendering`, `not found`).
