# Quickstart

From zero to generating weighted prompts in five steps.

## 1. Install

```bash
npm install pict-section-prompteditor
```

The section brings its UI dependencies with it (pict-section-modal for dialogs and the resizable rail, pict-section-picker for the insert control, pict-section-content for markdown rendering, jszip for downloads). Your application supplies pict itself.

## 2. Mount the section

Register the view against any container and render it. With no other configuration the section runs entirely in memory.

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
```

The section registers its own support pieces on first initialize: the `Pict-Section-Modal` view (initialized so dialogs and toasts are styled), the `Pict-Section-Picker` provider, the `Pict-Content` markdown provider, and the `{~WordListEntry:~}` template expression on the pict instance.

## 3. Seed some data

The default provider lives at `view._provider`. Seeding through it keeps everything observable in AppData:

```javascript
tmpEditor._provider.createWordList(
{
	Name: 'Dinosaurs',
	Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]]   // 75% / 25%
})
.then(() => tmpEditor._provider.createPrompt(
{
	TypeKey: 'feature-request',
	Title: 'Dinosaur enclosure dashboard',
	Segments:
	{
		'context': 'The {~WordListEntry:Dinosaurs~} enclosure has sensors nobody watches.',
		'request': 'Build a one-page dashboard.',
		'success-criteria': '- loads in under a second'
	}
}))
.then(() => tmpEditor.load());
```

Entries accept three shapes -- `['word', 3]` pairs, bare `'word'` strings (weight 1), or `{ Word, Weight }` objects -- and normalize to pairs.

## 4. Craft and generate

In the UI: pick a prompt, write markdown into each segment (the insert control drops `{~WordListEntry:Name~}` at your caret), then use the generate bar. **Preview one** renders an unsaved roll inline below the editor with a reroll button; **Generate** writes N records to the Generated tab, where the zip download packages them as `<slugged-title>-<sequence>.md` files.

Each occurrence of the expression draws independently, so one prompt referencing `{~WordListEntry:Dinosaurs~}` twice can land on two different dinosaurs.

## 5. Bring your own back end (when you are ready)

Everything the section reads and writes goes through one seam. Implement `PromptDataProvider` and pass it in:

```javascript
class MyProvider extends libPromptEditor.PromptDataProvider
{
	listWordLists() { return fetch('/1.0/WordLists').then((pResponse) => pResponse.json()); }
	// ... the other eleven primitives; see the API Reference
}

pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
{
	DefaultDestinationAddress: '#My-Container',
	DataProvider: new MyProvider()
}), libPromptEditor);
```

The in-memory provider is the reference implementation of the contract, including the expected list orderings.

## The rich editor (optional)

The inline segment editors are plain textareas and work everywhere. The "Open in editor" button hosts the full [pict-section-markdowneditor](https://fable-retold.github.io/pict-section-markdowneditor/) in a modal, and appears when CodeMirror 6 modules are available -- either on `window.CodeMirrorModules` or passed as the `CodeMirrorModules` option. See the Prompt Workshop example's `build/build-codemirror-bundle.js` for a ready-made esbuild recipe.

## Next

- [Configuration](configuration.md) -- every option the section takes
- [Developer Functions](functions.md) -- a snippet for each exposed function
- [Architecture](architecture.md) -- how the pieces fit
