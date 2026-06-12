# API Reference

The implementation reference: every class and contract in the module, what it owns, and how the pieces call each other. For copy-paste snippets per function, see [Developer Functions](functions.md).

## Module entry

`require('pict-section-prompteditor')` returns the view class as the default export, decorated with everything else:

| Export | Kind | Purpose |
|--------|------|---------|
| *(default)* | class | `PictViewPromptEditor`, the section view |
| `default_configuration` | object | The view's full default options (templates, CSS, every option) |
| `PromptDataProvider` | class | The data contract a host implements |
| `InMemoryPromptProvider` | class | The default provider; the contract's reference implementation |
| `normalizeEntries` | function | Word list entry normalization |
| `DefaultPromptTypes` | array | The five built-in prompt types |
| `resolvePromptTypes` | function | Configured set or defaults |
| `getPromptType` | function | Find a type by key, with a freeform fallback |
| `PromptCompiler` | object | `assembleSource`, `generate`, `wordListMap`, `slug`, `generatedFileName` |
| `PromptZip` | object | `buildZip`, `downloadBlob` |
| `PictTemplateWordListEntry` | class | The `{~WordListEntry:~}` template expression |
| `weightedPick` | function | The weighted random draw |

## PictViewPromptEditor

Extends `pict-view`. Registered like any pict view; renders three tabs into its destination.

### Lifecycle behavior

- `onBeforeInitialize` resolves the provider and prompt types, ensures support pieces (the `Pict-Section-Modal` view -- explicitly initialized so its CSS-variable scope class lands on `<body>` -- the `Pict-Section-Picker` provider, a `Pict-Content` markdown provider), and registers the `{~WordListEntry:~}` expression once per pict instance plus a resolver for this section's lists.
- `onAfterInitializeAsync` performs the initial `load()`.
- `onAfterRender` mounts the per-segment insert pickers and the rail panel, then injects CSS.

### Public methods (host-facing)

| Method | Returns | Purpose |
|--------|---------|---------|
| `load()` | Promise | Pull everything through the provider, reconcile selections, reshape, render. |
| `refresh()` | Promise | Alias for `load()`. |
| `setReadOnly(pBool)` | void | Toggle render-only mode and repaint. |
| `setDataProvider(pProvider)` | Promise | Swap the backplane at runtime (`null` restores in-memory) and reload. |

### UI handler methods

Called by the section's own templates (inline handlers); a host can drive them programmatically -- the test suite and the example do:

`selectTab(key)`, `selectPrompt(key)`, `newPrompt()`, `duplicatePrompt()`, `deletePrompt()`, `cachePromptTitle(v)` / `savePromptTitle()`, `setPromptType(key)`, `cacheSegment(segKey, v)` / `saveSegment(segKey)`, `toggleSegmentPreview(segKey)`, `insertWordList(segKey, listName, textareaId)`, `openRichEditor(segKey)`, `setGenerateCount(n)`, `generatePrompts()`, `previewOnce()` / `closePreview()` / `setPreviewMode('rendered'|'raw')` / `copyPreview()`, `newWordList()`, `selectWordList(key)`, `deleteWordList()`, `cacheWordListName(v)` / `saveWordListName()`, `cacheEntryWord(i, v)` / `cacheEntryWeight(i, v)` / `saveEntries()`, `addWordListEntry()` / `removeWordListEntry(i)`, `selectGenerated(key)`, `deleteGenerated()`, `clearGenerated()`, `copyGenerated()`, `downloadZip()`.

Two behavioral contracts worth knowing:

- **Value edits never re-render.** The `cache*` handlers update loaded records and dependent display via targeted DOM writes; persistence debounces (~400ms) and `save*` flushes. This keeps number spinners and typing focus alive.
- **`previewOnce()` does not persist.** It compiles one roll into the inline preview panel; only `generatePrompts()` writes `Generated` records.

## PromptDataProvider (the contract)

All primitives return Promises so a remote provider drops in cleanly. The base class rejects everything; implement all twelve:

```
listWordLists()                      -> Promise<WordList[]>
createWordList(draft)                -> Promise<WordList>
updateWordList(key, patch)           -> Promise<WordList>
deleteWordList(key)                  -> Promise<void>

listPrompts()                        -> Promise<Prompt[]>
createPrompt(draft)                  -> Promise<Prompt>
updatePrompt(key, patch)             -> Promise<Prompt>
deletePrompt(key)                    -> Promise<void>      // also removes the prompt's generations

listGenerated(promptKey?)            -> Promise<Generated[]>
createGenerated(draft)               -> Promise<Generated>
deleteGenerated(key)                 -> Promise<void>
clearGenerated(promptKey?)           -> Promise<void>
```

Conveniences built on the primitives (inherit them for free): `loadAll()` returns `{ WordLists, Prompts, Generated }` in one call; `getWordListByName(name)` finds a list trimmed and case-insensitive.

### Ordering contracts

The view renders lists exactly as the provider returns them:

- `listWordLists` -- by `Name`, ascending.
- `listPrompts` -- most recently updated first.
- `listGenerated` -- like a file listing: the prompt with the most recent generation first; within a prompt, `Sequence` ascending (001 at the top), matching the zip filenames.

### Record shapes

```javascript
WordList   { Key, Name, Entries: [[word, weight], ...], CreatedAt, UpdatedAt }
Prompt     { Key, Title, TypeKey, Segments: { segmentKey: markdown },
             Author, Meta, CreatedAt, UpdatedAt }
Generated  { Key, PromptKey, PromptTitle, TypeKey, Markdown, Sequence,
             Author, GeneratedAt }
```

`Meta` is opaque: the provider must round-trip it untouched. It is the seam where a host hangs ratings, version pointers, or anything else.

### InMemoryPromptProvider

The default and the reference implementation. Constructor options:

| Option | Default | Purpose |
|--------|---------|---------|
| `Store` | `{}` | The backing object (the view passes a node of AppData). |
| `Now` | `Date.now` | Timestamp source; pin for deterministic tests. |
| `KeyGenerator` | internal | `(prefix) => key`; pin for deterministic tests. |

Returned records are clones; mutating them never touches the store.

## PictTemplateWordListEntry

A `pict-template` subclass registering two patterns: `{~WordListEntry:` and `{~WLE:` (both closed by `~}`).

**Hash grammar:** `ListName` or `ListName:default`. The split is on the first colon, so defaults may contain colons; an empty default (`{~WLE:Name:~}`) renders nothing on a miss. With no default, a miss renders the expression back out literally.

**Resolution order:** word lists riding in the parse data (`__PromptEditorWordLists`, a `{ lowercasedName: Entries }` map, with `__PromptEditorRandom` as the optional random source), then the `pict.__PictSectionPromptEditorResolvers` registry (functions taking the lowercased name, returning Entries or null).

`weightedPick(entries, random?)` draws one word: an entry's chance is its positive weight over the total; zero-weight entries never draw; an empty or all-zero list returns `null`.

## PromptCompiler

| Function | Purpose |
|----------|---------|
| `assembleSource(prompt, type, options?)` | Segments to one markdown document, expressions intact. Options: `IncludeTitleHeading` (true), `SegmentHeadingLevel` (2). Fixed segments take the type's `Body`; empty optional segments are skipped; empty required ones get a placeholder note. |
| `generate(pict, prompt, type, wordLists, options?)` | One concrete roll: `assembleSource` then `pict.parseTemplate` with the lists in the parse data. Extra option: `RandomFunction`. |
| `wordListMap(wordLists)` | The `{ lowercasedName: Entries }` map `generate` feeds the expression. |
| `slug(text)` | Filesystem-friendly slug, max 60 chars. |
| `generatedFileName(generated)` | `<slug(PromptTitle)>-<Sequence padded to 3>.md`. |

## PromptZip

| Function | Purpose |
|----------|---------|
| `buildZip(files, options?)` | `[{ Name, Content }]` to a zip. Duplicate names get numeric suffixes. `options.Type`: `'blob'` (default, browser) or `'nodebuffer'` (tests). Resolves the jszip dependency, or `window.JSZip` when bundled apart. |
| `downloadBlob(blob, fileName)` | Hands a blob to the browser as a named download via a temporary anchor. |

## Prompt types

| Function | Purpose |
|----------|---------|
| `DefaultPromptTypes` | Feature Request (Context / Request / Success Criteria), Bug Report, Research, Code Review, Freeform. |
| `resolvePromptTypes(configured)` | A provided non-empty array wins outright; null/undefined means the defaults. |
| `getPromptType(types, key)` | Find by `Key`; an unknown key degrades to a freeform-style shape so orphaned prompts still render and compile. |

## normalizeEntries

`normalizeEntries(entries)` accepts pairs, bare strings, or `{ Word, Weight }` objects and returns clean `[[word, weight], ...]` pairs; weights default to 1 and bad weights coerce to 1. The in-memory provider applies it on every word list write.
