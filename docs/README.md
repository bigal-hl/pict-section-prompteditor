# Pict Section PromptEditor

A prompt crafting and management section for the Pict ecosystem. Prompts are markdown, organized by prompt type into segments (context, request, success criteria, and friends). Word list matrices with weights drive a `{~WordListEntry:Name~}` template expression, so one crafted prompt generates endless concrete variants. State is in-memory by default behind a pluggable data provider.

The intent is a team learning what language works with an AI pair: write prompt standards together, generate real prompts from them, and keep the source separate from the generations so you can compare, rate, and iterate.

## Features

- **Typed prompts with segments** -- five built-in prompt types (Feature Request, Bug Report, Research, Code Review, Freeform), each a named arrangement of markdown segments; pass your own array to replace them outright
- **Fixed preambles** -- a segment marked `Fixed` carries locked team-standard text, compiled into every prompt of that type and rendered read-only
- **Weighted word lists** -- curated `[word, weight]` matrices; an entry's share of draws is weight over total, shown live as you edit
- **The `{~WordListEntry:Name~}` expression** -- weighted-random resolution at generation time, short form `{~WLE:~}`, optional miss default `{~WLE:Name:fallback~}`
- **Full pict template engine** -- generation runs the assembled markdown through `pict.parseTemplate`, so every pict expression works inside a prompt
- **Inline preview with reroll** -- one unsaved generation below the editor, formatted/raw toggle, copy button
- **Batch generation + zip download** -- generate N, browse them rendered in file order, download `<slug>-<sequence>.md` files as one zip
- **Pluggable data backplane** -- `PromptDataProvider` is the seam; the in-memory default works with no server at all
- **Rich editing** -- plain textareas everywhere, with the full pict-section-markdowneditor in a modal when CodeMirror is available
- **Resizable layout** -- the list rail is a pict-section-modal panel: drag to resize, click to collapse, persisted per section

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
	Title: 'Team Prompt Workshop'
}), libPromptEditor);

pict.views['PromptEditor'].render();   // in-memory by default
```

The section renders three tabs: Prompts (the editor), Word Lists (the matrices), and Generated (the browseable output with a zip download).

See the [Quickstart](getting-started.md) for the full walkthrough including seeding data and wiring a custom provider.

## Module Structure

```
source/
  Pict-Section-PromptEditor.js              Main entry: the view class + all exports
  views/PictView-PromptEditor.js            The section view (three tabs, templates, CSS)
  providers/PromptProvider-Base.js          PromptDataProvider + InMemoryPromptProvider
  types/PromptEditor-DefaultTypes.js        Built-in prompt types + resolution helpers
  templates/Pict-Template-WordListEntry.js  The {~WordListEntry:~} expression + weightedPick
  compiler/PromptCompiler.js                Segments --> markdown source --> generation
  zip/PromptZip.js                          jszip packaging + browser download
```

## The Data Model at a Glance

| Record | Holds |
|--------|-------|
| `WordList` | `Key`, `Name`, `Entries: [[word, weight], ...]` |
| `Prompt` | `Key`, `Title`, `TypeKey`, `Segments: { segmentKey: markdown }`, `Meta` (opaque, round-trips untouched), `Author` |
| `Generated` | `Key`, `PromptKey`, `PromptTitle`, `TypeKey`, `Markdown` (fully resolved), `Sequence` |

See [Architecture](architecture.md) for how the pieces connect and [Configuration](configuration.md) for every option.

## Documentation

- [Quickstart](getting-started.md) -- install, mount, seed, generate
- [Configuration](configuration.md) -- complete options reference
- [Architecture](architecture.md) -- the design, with a diagram
- [API Reference](api.md) -- classes, methods, and contracts
- [Developer Functions](functions.md) -- a snippet for every exposed function
- [Examples](examples.md) -- the Prompt Workshop example application

## Example Applications

| Example | Description |
|---------|-------------|
| **Prompt Workshop** | The full section in memory: seeded word lists and prompts, inline preview, batch generation, zip download |

## Related Packages

- [pict](https://fable-retold.github.io/pict/) -- Core MVC framework
- [pict-view](https://fable-retold.github.io/pict-view/) -- Base view class
- [pict-section-modal](https://fable-retold.github.io/pict-section-modal/) -- Dialogs, toasts, and the resizable rail panel
- [pict-section-picker](https://fable-retold.github.io/pict-section-picker/) -- The searchable insert-word-list control
- [pict-section-markdowneditor](https://fable-retold.github.io/pict-section-markdowneditor/) -- The rich segment editor
- [fable](https://fable-retold.github.io/fable/) -- Service provider and dependency injection
