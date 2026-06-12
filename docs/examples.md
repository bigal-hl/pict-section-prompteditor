# Examples

The module ships one example application under `example_applications/`, staged into these docs so it runs right here.

## Prompt Workshop

The full section running in memory: seeded word lists (Dinosaurs weighted 3:1, Tone), two prompts that template against them, inline preview with reroll, batch generation, and the zip download. Nothing is sent anywhere.

- [Read the example's guide](examples/prompt_workshop/README.md)
- [Launch it](examples/prompt_workshop/index.html)

What to try, in order:

1. **Prompts tab** -- open "Dinosaur enclosure dashboard". Each segment is markdown; the searchable insert control drops `{~WordListEntry:Name~}` at your caret.
2. **Preview one** -- an unsaved roll renders inline below the editor. Reroll a few times and watch the dinosaur change (75% Tyrannosaurus). Toggle Formatted / Markdown; Copy grabs the markdown.
3. **Word Lists tab** -- edit a weight and watch the share chips recompute live. The rail is resizable (drag the edge) and collapsible.
4. **Generate** -- set a count, generate, land on the Generated tab in file order, download the zip.
5. **Open in editor** -- the full pict-section-markdowneditor in a modal, via the example's bundled CodeMirror.

## Running it from the repository

```bash
cd example_applications/prompt_workshop
npm install
npx quack build && npx quack copy
# serve dist/ and open index.html — or `npm run example` from the module root
```

The example follows the canonical Retold example-application harness: the `pict-example-header` chrome, pict served locally from `js/pict.min.js`, and the `retold.ExampleApplication` metadata block in its `package.json` (which is also what stages it into these docs).

## Worth stealing from the example source

- `source/Pict-Application-PromptWorkshop.js` -- seeding through the provider before first render
- `source/views/PictView-PromptWorkshop-Layout.js` -- the layout-then-section render ordering
- `build/build-codemirror-bundle.js` -- a ready-made esbuild recipe for the CodeMirror bundle the rich editor wants
