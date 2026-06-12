# Configuration

Every option the section accepts, with defaults. Pass overrides when registering the view:

```javascript
pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
{
	DefaultDestinationAddress: '#My-Container',
	Title: 'Team Prompt Workshop',
	GenerateDefaultCount: 10
}), libPromptEditor);
```

## Mounting

| Option | Default | Purpose |
|--------|---------|---------|
| `DefaultDestinationAddress` | `'#PromptEditor-Container'` | CSS selector the section renders into. |
| `Title` | `'Prompt Editor'` | The section header text. |
| `AutoRender` | `false` | Render automatically after initialize. |

## Data

| Option | Default | Purpose |
|--------|---------|---------|
| `DataProvider` | `null` | A `PromptDataProvider` implementation. `null` means the in-memory default, stored per instance in AppData. |
| `PromptTypes` | `null` | Replaces the built-in prompt type set outright. `null` means `DefaultPromptTypes`. Spread the defaults into your array to extend instead. |
| `CurrentUser` | `{ Key: '', Name: 'Anonymous' }` | Stamped as `Author` on prompts and generations the user creates. |
| `ReadOnly` | `false` | Render-only: no creation, editing, generation, or deletion. |

## Generation

| Option | Default | Purpose |
|--------|---------|---------|
| `RandomFunction` | `null` | The random source for weighted draws, `() => [0, 1)`. `null` means `Math.random`. Pin it for deterministic tests. |
| `IncludeTitleHeading` | `true` | Compile `# Title` at the top of each generation. |
| `SegmentHeadingLevel` | `2` | Heading level for segment names (`## Context`). Clamped 1-6. |
| `GenerateDefaultCount` | `5` | The generate bar's starting count. |
| `GenerateMaxCount` | `100` | Upper bound per generate click. |
| `ZipFileName` | `'prompts.zip'` | The download's filename. |

## Rich editing

| Option | Default | Purpose |
|--------|---------|---------|
| `CodeMirrorModules` | `null` | CodeMirror 6 exports for the rich editor modal (`{ EditorView, EditorState, basicSetup, markdown, ... }`). Falls back to `window.CodeMirrorModules`; when neither exists the "Open in editor" button is hidden and the plain textareas carry the day. |

## Event hooks

All optional; a host wires these to autosave, audit, ratings, collaboration.

| Hook | Fires |
|------|-------|
| `onPromptSaved(prompt)` | After any prompt create or update. |
| `onPromptDeleted(prompt)` | After a prompt (and its generations) is deleted. |
| `onWordListSaved(list)` | After any word list create or update. |
| `onWordListDeleted(list)` | After a word list is deleted. |
| `onGenerated(batch)` | After a generate run, with the array of created records. |
| `onChange({ Event, Payload })` | After every mutation, as a catch-all (`Event` is the hook name minus `on`). |

Hooks that throw are swallowed -- a host bug must not break the section.

## Prompt type shape

A prompt type is a named arrangement of segments:

```javascript
{
	Key: 'team-standard',          // stable identifier
	Name: 'Team Standard',         // shown in the type select
	Description: 'When to use it', // shown under the editor header
	Segments:
	[
		{
			Key: 'preamble',                       // a prompt's Segments object is keyed by this
			Name: 'Preamble',                      // the heading the compiler writes
			Guidance: 'One line for the author',   // shown beside the segment name
			Fixed: true,                           // locked text; Body below is used, rendered read-only
			Body: 'You are our careful assistant.',
			Optional: false                        // empty optional segments are skipped at compile
		}
	]
}
```

Switching a prompt's type is non-destructive: segment bodies stay keyed on the prompt; the type decides which ones show and compile.

## CSS

The section ships its styles in the configuration `CSS` property (prefix `.pspe-`) and registers them through the pict CSS cascade. Colors flow through `--theme-color-*` tokens with hex fallbacks, so themed hosts restyle it automatically and bare pages still look right. `CSSPriority` defaults to 500.
