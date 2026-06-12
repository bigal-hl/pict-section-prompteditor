# pict-section-prompteditor

> **[Read the Pict-Section-PromptEditor Documentation](https://fable-retold.github.io/pict-section-prompteditor/)** - interactive docs with the full API reference and a runnable example.

A prompt crafting and management section for the [Pict](https://github.com/fable-retold/pict) ecosystem. Prompts are markdown organized by type into segments, word list matrices with weights drive a `{~WordListEntry:Name~}` template expression, and one crafted prompt generates endless concrete variants you can browse and download as a zip.

[MIT License](LICENSE)

## Features

- Typed prompts with markdown segments (Context / Request / Success Criteria and friends), plus **fixed preamble** segments for locked team standards
- A per-prompt "segment headings in the output" toggle, saved with the prompt: on for structured documents (`## Context` above each block), off for bare bodies
- Weighted word list matrices: `[["Tyrannosaurus", 3], ["Diplodocus", 1]]` draws 75/25, with live share percentages as you curate
- The `{~WordListEntry:Name~}` template expression (short form `{~WLE:~}`), with an optional miss default: `{~WLE:Name:fallback~}`
- Generation runs the **real pict template engine**, so every pict expression works inside a prompt
- Inline preview with reroll, Formatted / Markdown toggle, and a copy button
- Batch generation with provenance, browsed in file order, downloaded as a zip of `<slug>-<sequence>.md` files
- Pluggable data backplane: in-memory by default, one `PromptDataProvider` class to back it with your API
- Opaque `Meta`, `Author` stamping, stable keys, and mutation hooks: the seams a host platform layers ratings and collaboration onto
- Resizable, collapsible list rail (a pict-section-modal panel) and a searchable insert control (pict-section-picker)
- Rich segment editing via pict-section-markdowneditor in a modal when CodeMirror is available; plain textareas otherwise

## Installation

```bash
npm install pict-section-prompteditor
```

## Quick Start

```javascript
const libPromptEditor = require('pict-section-prompteditor');

pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
{
	DefaultDestinationAddress: '#My-Container',
	Title: 'Team Prompt Workshop',
	CurrentUser: { Key: 42, Name: 'Steven' }
}), libPromptEditor);

let tmpEditor = pict.views['PromptEditor'];
tmpEditor.render();

// Seed through the provider (in-memory by default), then reload the section.
tmpEditor._provider.createWordList(
	{ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]] })
	.then(() => tmpEditor.load());
```

The section renders three tabs: Prompts (the editor), Word Lists (the matrices), and Generated (the browseable output with a zip download). Write `{~WordListEntry:Dinosaurs~}` in any segment and each generation draws Tyrannosaurus 75% of the time.

To back it with your own API instead of memory, implement the twelve-method `PromptDataProvider` contract and pass it as `DataProvider` -- the in-memory provider is the reference implementation.

## Documentation

Full documentation is available in the [docs/](./docs/) directory and hosted at [fable-retold.github.io/pict-section-prompteditor](https://fable-retold.github.io/pict-section-prompteditor/):

- [Quickstart](./docs/getting-started.md) -- install, mount, seed, generate
- [Configuration](./docs/configuration.md) -- complete options reference
- [Architecture](./docs/architecture.md) -- the design, with a diagram
- [API Reference](./docs/api.md) -- classes, methods, and contracts
- [Developer Functions](./docs/functions.md) -- a snippet for every exposed function
- [Examples](./docs/examples.md) -- the Prompt Workshop example application

## Example Applications

| Example | Description |
|---------|-------------|
| [Prompt Workshop](./example_applications/prompt_workshop/) | The full section in memory: seeded word lists and prompts, inline preview with reroll, batch generation, zip download |

Build it:

```bash
cd example_applications/prompt_workshop
npm install
npx quack build && npx quack copy
# serve dist/ and open index.html — or `npm run example` from the module root
```

## API Overview

| Export | Description |
|--------|-------------|
| *(default)* / `default_configuration` | The section view class and its full default options |
| `PromptDataProvider` | The data contract a host implements |
| `InMemoryPromptProvider` | The default provider; deterministic via `Now` / `KeyGenerator` options |
| `DefaultPromptTypes` / `resolvePromptTypes` / `getPromptType` | The built-in prompt types and their resolution helpers |
| `PromptCompiler` | `assembleSource`, `generate`, `wordListMap`, `slug`, `generatedFileName` |
| `PromptZip` | `buildZip`, `downloadBlob` |
| `PictTemplateWordListEntry` / `weightedPick` | The template expression class and the weighted draw |
| `normalizeEntries` | Word list entry normalization |

View instance methods hosts call: `load()`, `refresh()`, `setReadOnly(bool)`, `setDataProvider(provider)` -- plus every UI action as a drivable method. See [Developer Functions](./docs/functions.md) for snippets.

## Testing

```bash
npm test
```

Fifty-seven mocha tests cover the provider contract, the weighted draw and expression, the compiler, zip round-trips, and the view (including focus-preserving edits and multi-instance isolation).

## Related Packages

- [pict](https://github.com/fable-retold/pict) -- Core MVC framework
- [pict-view](https://github.com/fable-retold/pict-view) -- Base view class
- [pict-section-modal](https://github.com/fable-retold/pict-section-modal) -- Dialogs, toasts, and the resizable rail panel
- [pict-section-picker](https://github.com/fable-retold/pict-section-picker) -- The searchable insert control
- [pict-section-markdowneditor](https://github.com/fable-retold/pict-section-markdowneditor) -- The rich segment editor
- [pict-section-content](https://github.com/fable-retold/pict-section-content) -- Markdown rendering
- [fable](https://github.com/fable-retold/fable) -- Service provider and dependency injection

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.
