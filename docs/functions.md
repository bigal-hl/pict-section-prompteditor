# Developer Functions

A working snippet for every exposed function a developer uses to drive the module at full capacity. Everything below hangs off the main entry:

```javascript
const libPromptEditor = require('pict-section-prompteditor');
```

## The view

### Registering and rendering the section

The default export is the view class; `default_configuration` carries the templates, CSS, and every option.

```javascript
pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
{
	DefaultDestinationAddress: '#My-Container',
	Title: 'Team Prompt Workshop',
	CurrentUser: { Key: 42, Name: 'Steven' },
	GenerateDefaultCount: 10,
	onGenerated: (pBatch) => console.log(pBatch.length + ' prompts generated')
}), libPromptEditor);

pict.views['PromptEditor'].render();
```

### view.load() / view.refresh()

Pull everything through the provider and repaint. Call after seeding or after out-of-band data changes.

```javascript
tmpEditor._provider.createWordList({ Name: 'Tone', Entries: ['precise', 'playful'] })
	.then(() => tmpEditor.load());
```

### view.setDataProvider(pProvider)

Swap the backplane at runtime and reload. Pass `null` to restore the in-memory default.

```javascript
tmpEditor.setDataProvider(new MyRestProvider({ BaseURL: '/1.0/' }))
	.then(() => console.log('now server-backed'));
```

### view.setReadOnly(pReadOnly)

Render-only mode: no creation, editing, generation, or deletion.

```javascript
tmpEditor.setReadOnly(true);    // a reviewer's view
```

### Driving the UI programmatically

Every toolbar action is a method, so hosts and tests can drive flows without clicking:

```javascript
tmpEditor.selectTab('wordlists');         // 'prompts' | 'wordlists' | 'generated'
tmpEditor.selectPrompt(tmpPromptKey);
tmpEditor.setGenerateCount(25);
tmpEditor.generatePrompts();              // writes Generated records, switches tabs
tmpEditor.previewOnce();                  // one UNSAVED roll in the inline panel
tmpEditor.setPreviewMode('raw');          // 'rendered' | 'raw' markdown source
tmpEditor.downloadZip();                  // everything generated, as markdown files
```

## The data seam

### Implementing PromptDataProvider

The contract a host implements to back the section with its own API. All twelve primitives return Promises; `loadAll()` and `getWordListByName()` come free from the base.

```javascript
class MyRestProvider extends libPromptEditor.PromptDataProvider
{
	listWordLists() { return fetch('/1.0/WordLists').then((pR) => pR.json()); }
	createWordList(pDraft) { return this._post('/1.0/WordList', pDraft); }
	updateWordList(pKey, pPatch) { return this._put('/1.0/WordList/' + pKey, pPatch); }
	deleteWordList(pKey) { return this._delete('/1.0/WordList/' + pKey); }

	listPrompts() { return fetch('/1.0/Prompts').then((pR) => pR.json()); }
	createPrompt(pDraft) { return this._post('/1.0/Prompt', pDraft); }
	updatePrompt(pKey, pPatch) { return this._put('/1.0/Prompt/' + pKey, pPatch); }
	deletePrompt(pKey) { return this._delete('/1.0/Prompt/' + pKey); }

	listGenerated(pPromptKey) { return fetch('/1.0/Generated' + (pPromptKey ? '?prompt=' + pPromptKey : '')).then((pR) => pR.json()); }
	createGenerated(pDraft) { return this._post('/1.0/Generated', pDraft); }
	deleteGenerated(pKey) { return this._delete('/1.0/Generated/' + pKey); }
	clearGenerated(pPromptKey) { return this._delete('/1.0/Generated' + (pPromptKey ? '?prompt=' + pPromptKey : '')); }
}
```

Keep the [ordering contracts](api.md#ordering-contracts): word lists by name, prompts newest-updated first, generated output in file order.

### InMemoryPromptProvider

The default. Use it directly for tests or headless work -- `Now` and `KeyGenerator` make it deterministic:

```javascript
let tmpClock = 1000;
let tmpCounter = 0;
let tmpProvider = new libPromptEditor.InMemoryPromptProvider(
{
	Store: {},                                  // or a node of AppData
	Now: () => tmpClock++,
	KeyGenerator: (pPrefix) => pPrefix + '_' + (++tmpCounter)
});

tmpProvider.createPrompt({ TypeKey: 'freeform', Title: 'T' })
	.then((pPrompt) => console.log(pPrompt.Key));   // 'pr_1'
```

### provider.loadAll()

The three collections in one call -- what the view itself uses:

```javascript
tmpProvider.loadAll().then((pAll) =>
{
	console.log(pAll.WordLists.length, pAll.Prompts.length, pAll.Generated.length);
});
```

### provider.getWordListByName(pName)

Trimmed, case-insensitive lookup:

```javascript
tmpProvider.getWordListByName('  dInOsAuRs ').then((pList) => console.log(pList.Entries));
```

### normalizeEntries(pEntries)

Accepts pairs, bare strings, or objects; returns clean pairs with weights defaulted to 1:

```javascript
libPromptEditor.normalizeEntries(['Diplodocus', ['Tyrannosaurus', 3], { Word: 'Stegosaurus', Weight: 2 }]);
// [['Diplodocus', 1], ['Tyrannosaurus', 3], ['Stegosaurus', 2]]
```

## Prompt types

### DefaultPromptTypes

The five built-ins. Spread them to extend rather than replace:

```javascript
pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
{
	PromptTypes:
	[
		{
			Key: 'team-standard', Name: 'Team Standard',
			Segments:
			[
				{ Key: 'preamble', Name: 'Preamble', Fixed: true, Body: 'You are our careful assistant.' },
				{ Key: 'ask', Name: 'Ask', Guidance: 'What you want done.' }
			]
		},
		...libPromptEditor.DefaultPromptTypes
	]
}), libPromptEditor);
```

### resolvePromptTypes(pConfigured)

The view's own resolution rule, exposed for symmetry: a non-empty array wins, otherwise the defaults.

```javascript
libPromptEditor.resolvePromptTypes(null) === libPromptEditor.DefaultPromptTypes;   // true
```

### getPromptType(pTypes, pTypeKey)

Find by key; an unknown key degrades to a freeform-style shape so orphaned prompts still compile:

```javascript
let tmpType = libPromptEditor.getPromptType(libPromptEditor.DefaultPromptTypes, 'feature-request');
console.log(tmpType.Segments.map((pSegment) => pSegment.Key));
// ['context', 'request', 'success-criteria']
```

## The compiler

### PromptCompiler.assembleSource(pPrompt, pType, pOptions)

Segments to one markdown document with template expressions intact -- the versionable source:

```javascript
const { PromptCompiler } = libPromptEditor;

let tmpSource = PromptCompiler.assembleSource(tmpPrompt, tmpType,
	{ IncludeTitleHeading: true, SegmentHeadingLevel: 2 });
// # Dinosaur care
//
// ## Context
//
// Feed the {~WordListEntry:Dinosaurs~} on schedule.
```

### PromptCompiler.generate(pPict, pPrompt, pType, pWordLists, pOptions)

One concrete roll through the real pict template engine. Headless generation outside the view:

```javascript
let tmpMarkdown = PromptCompiler.generate(pict, tmpPrompt, tmpType, tmpWordLists,
	{ RandomFunction: () => 0.9 });   // pin the draw for tests
// every {~WordListEntry:~} (and every other pict expression) resolved
```

### PromptCompiler.wordListMap(pWordLists)

The `{ lowercasedName: Entries }` map `generate` feeds the expression -- useful when calling `pict.parseTemplate` yourself:

```javascript
let tmpResolved = pict.parseTemplate(tmpSource,
{
	__PromptEditorWordLists: PromptCompiler.wordListMap(tmpWordLists),
	__PromptEditorRandom: myRandom
}, null, []);
```

### PromptCompiler.slug(pText) / PromptCompiler.generatedFileName(pGenerated)

The zip naming pieces:

```javascript
PromptCompiler.slug('Add the Thing! (v2)');                              // 'add-the-thing-v2'
PromptCompiler.generatedFileName({ PromptTitle: 'Add the Thing!', Sequence: 7 });
// 'add-the-thing-007.md'
```

## Zip packaging

### PromptZip.buildZip(pFiles, pOptions)

Named markdown files to a zip. Duplicate names get numeric suffixes. Use `nodebuffer` in node:

```javascript
const { PromptZip } = libPromptEditor;

PromptZip.buildZip(
[
	{ Name: 'first-001.md', Content: '# One' },
	{ Name: 'second-001.md', Content: '# Two' }
]).then((pBlob) => PromptZip.downloadBlob(pBlob, 'prompts.zip'));
```

### PromptZip.downloadBlob(pBlob, pFileName)

Hands any blob to the browser as a named download:

```javascript
PromptZip.downloadBlob(new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');
```

## The template expression

### Registering PictTemplateWordListEntry yourself

The view registers it automatically on first initialize. Hosts that want `{~WordListEntry:~}` active before any section mounts register the class and feed it through the resolver registry:

```javascript
pict.addTemplate(libPromptEditor.PictTemplateWordListEntry);

pict.__PictSectionPromptEditorResolvers = pict.__PictSectionPromptEditorResolvers || [];
pict.__PictSectionPromptEditorResolvers.push((pNameLower) =>
	(pNameLower === 'dinosaurs') ? [['Tyrannosaurus', 3], ['Diplodocus', 1]] : null);

pict.parseTemplate('I choose {~WordListEntry:Dinosaurs~}!', {}, null, []);
// 'I choose Tyrannosaurus!' (75% of the time)
```

The expression grammar in templates:

```text
{~WordListEntry:Dinosaurs~}            one weighted draw; a miss echoes the expression
{~WLE:Dinosaurs~}                      short form, identical behavior
{~WLE:Dinosaurs:a large lizard~}       miss default (first-colon split; may contain colons)
{~WLE:Dinosaurs:~}                     empty default: render nothing on a miss
```

### weightedPick(pEntries, pRandom)

The draw itself, exposed for hosts building their own randomization:

```javascript
libPromptEditor.weightedPick([['Tyrannosaurus', 3], ['Diplodocus', 1]], Math.random);
// 'Tyrannosaurus' ~75% of calls; null for an empty or all-zero list
```
