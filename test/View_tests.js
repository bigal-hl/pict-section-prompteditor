'use strict';

const { JSDOM } = require('jsdom');
let _DOM = new JSDOM('<!doctype html><html><body><div id="PromptEditor-Container"></div></body></html>', { url: 'http://localhost/' });
global.window = _DOM.window;
global.document = _DOM.window.document;

// Node has no bare localStorage; the modal's panel persistence writes through
// it (guarded by try/catch), so give tests an in-memory shim to assert against.
if (typeof global.localStorage === 'undefined')
{
	let _LocalStore = {};
	global.localStorage =
	{
		getItem: (pKey) => (pKey in _LocalStore ? _LocalStore[pKey] : null),
		setItem: (pKey, pValue) => { _LocalStore[pKey] = String(pValue); },
		removeItem: (pKey) => { delete _LocalStore[pKey]; }
	};
}

const libChai = require('chai');
const libExpect = libChai.expect;

const libPict = require('pict');
const libPromptEditor = require('../source/Pict-Section-PromptEditor.js');

function freshSection(pOptions)
{
	let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
	tmpPict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration, pOptions || {}), libPromptEditor);
	let tmpView = tmpPict.views['PromptEditor'];
	return new Promise((fResolve) =>
	{
		tmpView.initializeAsync(() => fResolve({ pict: tmpPict, view: tmpView }));
	});
}

suite('PromptEditor view', function ()
{
	// Test files each stand up a jsdom at load time and the last one wins the
	// global; rebuild the container in the live document before every test.
	setup(function () { document.body.innerHTML = '<div id="PromptEditor-Container"></div>'; });

	test('initializes with the default in-memory provider and renders the section', function ()
	{
		return freshSection().then(({ pict, view }) =>
		{
			view.render();
			let tmpHTML = document.getElementById('PromptEditor-Container').innerHTML;
			libExpect(tmpHTML).to.contain('pspe-header');
			libExpect(tmpHTML).to.contain('Prompts');
			libExpect(pict.AppData.PromptEditorStores[view.Hash]).to.be.an('object');
		});
	});

	test('the full loop: word list, prompt, segments, generate, zip files shape', function ()
	{
		let tmpHarness;
		return freshSection({ RandomFunction: () => 0.9 })
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createWordList({ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]] });
			})
			.then(() => tmpHarness.view._provider.createPrompt(
				{
					TypeKey: 'feature-request',
					Title: 'Dinosaur care',
					Segments:
					{
						'context': 'We keep a {~WordListEntry:Dinosaurs~} in the office.',
						'request': 'Write a care guide.',
						'success-criteria': 'The {~WordListEntry:Dinosaurs~} thrives.'
					}
				}))
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				tmpView.setGenerateCount(3);
				tmpView.generatePrompts();
				// generatePrompts resolves through promises; give them a tick.
				return new Promise((fResolve) => setTimeout(fResolve, 50));
			})
			.then(() => tmpHarness.view._provider.listGenerated())
			.then((pGenerated) =>
			{
				libExpect(pGenerated).to.have.length(3);
				// RandomFunction pins every draw at 0.9 -> Diplodocus.
				libExpect(pGenerated[0].Markdown).to.contain('We keep a Diplodocus in the office.');
				libExpect(pGenerated[0].Markdown).to.contain('# Dinosaur care');
				libExpect(pGenerated[0].Markdown).to.contain('## Success Criteria');
				libExpect(pGenerated[0].Markdown).to.not.contain('{~WordListEntry:');
			});
	});

	test('fixed segments compile from the type, not the prompt', function ()
	{
		let tmpTypes =
		[{
			Key: 'standard', Name: 'Standard',
			Segments:
			[
				{ Key: 'preamble', Name: 'Preamble', Fixed: true, Body: 'You are our careful assistant.' },
				{ Key: 'ask', Name: 'Ask' }
			]
		}];
		let tmpHarness;
		return freshSection({ PromptTypes: tmpTypes })
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'standard', Title: 'T', Segments: { 'ask': 'Do the thing.' } });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				tmpHarness.view.setGenerateCount(1);
				tmpHarness.view.generatePrompts();
				return new Promise((fResolve) => setTimeout(fResolve, 50));
			})
			.then(() => tmpHarness.view._provider.listGenerated())
			.then((pGenerated) =>
			{
				libExpect(pGenerated[0].Markdown).to.contain('## Preamble\n\nYou are our careful assistant.');
				libExpect(pGenerated[0].Markdown).to.contain('## Ask\n\nDo the thing.');
			});
	});

	test('preview renders a roll inline below the editor, not in a modal', function ()
	{
		let tmpHarness;
		return freshSection({ RandomFunction: () => 0.0 })
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createWordList({ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]] });
			})
			.then(() => tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'P', Segments: { 'body': 'See the {~WordListEntry:Dinosaurs~}.' } }))
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				tmpHarness.view.previewOnce();
				let tmpHTML = document.getElementById('PromptEditor-Container').innerHTML;
				libExpect(tmpHTML).to.contain('Preview roll');
				libExpect(tmpHTML).to.contain('See the Tyrannosaurus.');
				libExpect(document.querySelector('.pict-modal-dialog')).to.equal(null);
				tmpHarness.view.closePreview();
				libExpect(document.getElementById('PromptEditor-Container').innerHTML).to.not.contain('Preview roll');
			});
	});

	test('the preview toggles between formatted and raw markdown', function ()
	{
		let tmpHarness;
		return freshSection({ RandomFunction: () => 0.0 })
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'Toggle me', Segments: { 'body': 'Some **bold** text.' } });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				tmpView.previewOnce();
				let tmpContainer = document.getElementById('PromptEditor-Container');
				// Formatted by default: the markdown heading marker is consumed.
				libExpect(tmpContainer.querySelector('.pspe-preview-raw')).to.equal(null);
				tmpView.setPreviewMode('raw');
				let tmpRaw = tmpContainer.querySelector('.pspe-preview-raw');
				libExpect(tmpRaw).to.not.equal(null);
				libExpect(tmpRaw.textContent).to.contain('# Toggle me');
				libExpect(tmpRaw.textContent).to.contain('Some **bold** text.');
				// The mode is sticky across rerolls.
				tmpView.previewOnce();
				libExpect(tmpContainer.querySelector('.pspe-preview-raw')).to.not.equal(null);
				tmpView.setPreviewMode('rendered');
				libExpect(tmpContainer.querySelector('.pspe-preview-raw')).to.equal(null);
			});
	});

	test('copyPreview degrades politely when no clipboard exists', function ()
	{
		let tmpHarness;
		return freshSection({ RandomFunction: () => 0.0 })
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'C', Segments: { 'body': 'text' } });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				// jsdom has no navigator.clipboard; this must not throw.
				tmpHarness.view.previewOnce();
				tmpHarness.view.copyPreview();
			});
	});

	test('switching prompts drops the preview panel', function ()
	{
		let tmpHarness;
		let tmpSecondKey;
		return freshSection({ RandomFunction: () => 0.0 })
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'First', Segments: { 'body': 'one' } });
			})
			.then(() => tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'Second', Segments: { 'body': 'two' } }))
			.then((pSecond) => { tmpSecondKey = pSecond.Key; return tmpHarness.view.load(); })
			.then(() =>
			{
				tmpHarness.view.previewOnce();
				libExpect(document.getElementById('PromptEditor-Container').innerHTML).to.contain('Preview roll');
				tmpHarness.view.selectPrompt(tmpSecondKey);
				libExpect(document.getElementById('PromptEditor-Container').innerHTML).to.not.contain('Preview roll');
			});
	});

	test('the list rail is a resizable, collapsible pict-section-modal panel', function ()
	{
		let tmpHarness;
		return freshSection()
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'P', Segments: {} });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				let tmpRail = document.getElementById('pspe-rail-' + tmpView.Hash + '-prompts');
				libExpect(tmpRail.classList.contains('pict-panel')).to.equal(true);
				libExpect(tmpRail.classList.contains('pict-panel-left')).to.equal(true);
				libExpect(tmpRail.style.width).to.equal('320px');
				// The edge (resize handle + collapse tab) sits beside the rail.
				libExpect(tmpRail.parentElement.querySelector('.pict-panel-edge')).to.not.equal(null);
				libExpect(tmpRail.parentElement.querySelector('.pict-panel-resize')).to.not.equal(null);
				// Collapse persists; switching tabs re-attaches collapsed.
				tmpView._railPanelHandle.collapse();
				libExpect(tmpRail.classList.contains('pict-panel-collapsed')).to.equal(true);
				let tmpStored = JSON.parse(localStorage.getItem('pict-panel-pspe-rail-' + tmpView.Hash));
				libExpect(tmpStored.collapsed).to.equal(true);
				tmpView.selectTab('generated');
				let tmpGeneratedRail = document.getElementById('pspe-rail-' + tmpView.Hash + '-generated');
				libExpect(tmpGeneratedRail.classList.contains('pict-panel-collapsed')).to.equal(true);
				// Expand and confirm the width survives for the next test run.
				tmpView._railPanelHandle.expand();
				libExpect(tmpGeneratedRail.classList.contains('pict-panel-collapsed')).to.equal(false);
				localStorage.removeItem('pict-panel-pspe-rail-' + tmpView.Hash);
			});
	});

	test('the insert control is a pict-section-picker that inserts on pick', function ()
	{
		let tmpHarness;
		return freshSection()
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createWordList({ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3]] });
			})
			.then(() => tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'P', Segments: { 'body': 'Hello ' } }))
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				libExpect(tmpView.pict.providers['Pict-Section-Picker']).to.exist;
				libExpect(document.getElementById('pspe-ins-' + tmpView.Hash + '-body')).to.not.equal(null);
				let tmpPicker = tmpView.pict.views['PromptEditor-Ins-' + tmpView.Hash + '-body'];
				libExpect(tmpPicker).to.exist;
				libExpect(tmpPicker.options.Options.map((pOption) => pOption.Value)).to.deep.equal(['Dinosaurs']);
				// Picking fires OnChange, which inserts the expression and saves.
				tmpPicker.options.OnChange('Dinosaurs');
				return new Promise((fResolve) => setTimeout(fResolve, 50))
					.then(() => tmpView._provider.listPrompts())
					.then((pPrompts) =>
					{
						libExpect(pPrompts[0].Segments.body).to.contain('{~WordListEntry:Dinosaurs~}');
					});
			});
	});

	test('picker options refresh when word lists change', function ()
	{
		let tmpHarness;
		return freshSection()
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'P', Segments: {} });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				let tmpPicker = tmpView.pict.views['PromptEditor-Ins-' + tmpView.Hash + '-body'];
				libExpect(tmpPicker.options.Options).to.have.length(0);
				return tmpView._provider.createWordList({ Name: 'Tone', Entries: [['precise', 1]] })
					.then(() => tmpView.load())
					.then(() =>
					{
						tmpView.selectTab('prompts');
						libExpect(tmpPicker.options.Options.map((pOption) => pOption.Value)).to.deep.equal(['Tone']);
					});
			});
	});

	test('weight edits update shares in place without re-rendering the pane', function ()
	{
		let tmpHarness;
		return freshSection()
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createWordList({ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]] });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				tmpView.selectTab('wordlists');
				let tmpInput = document.querySelector('.pspe-entry-weight');
				let tmpPct = document.getElementById('pspe-pct-' + tmpView.Hash + '-1');
				libExpect(tmpPct.textContent).to.equal('25%');

				// Simulate spinner clicks: oninput fires cacheEntryWeight.
				tmpView.cacheEntryWeight(1, 3);
				// Shares refreshed in place...
				libExpect(document.getElementById('pspe-pct-' + tmpView.Hash + '-0').textContent).to.equal('50%');
				libExpect(document.getElementById('pspe-pct-' + tmpView.Hash + '-1').textContent).to.equal('50%');
				// ...and the EXACT SAME input element is still in the document
				// (a re-render would have replaced it and broken the spinner).
				libExpect(document.contains(tmpInput)).to.equal(true);
				libExpect(document.querySelector('.pspe-entry-weight')).to.equal(tmpInput);

				// The save is debounced: the store has not been written yet.
				return tmpView._provider.listWordLists()
					.then((pLists) =>
					{
						libExpect(pLists[0].Entries[1][1]).to.equal(1);
						// Flush (the onchange path) persists without rendering.
						return tmpView.saveEntries();
					})
					.then(() => tmpView._provider.listWordLists())
					.then((pLists) =>
					{
						libExpect(pLists[0].Entries[1][1]).to.equal(3);
						libExpect(document.contains(tmpInput)).to.equal(true);
					});
			});
	});

	test('title and name edits mirror into the rail without re-rendering', function ()
	{
		let tmpHarness;
		return freshSection()
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				return tmpHarness.view._provider.createPrompt({ TypeKey: 'freeform', Title: 'Before', Segments: {} });
			})
			.then(() => tmpHarness.view.load())
			.then(() =>
			{
				let tmpView = tmpHarness.view;
				let tmpPrompt = tmpView._activePrompt();
				let tmpTitleInput = document.querySelector('.pspe-editor-title');
				tmpView.cachePromptTitle('After <b>edit</b>');
				let tmpRailName = document.getElementById('pspe-prname-' + tmpView.Hash + '-' + tmpPrompt.Key);
				libExpect(tmpRailName.textContent).to.equal('After <b>edit</b>');
				libExpect(tmpRailName.querySelector('b')).to.equal(null);
				libExpect(document.contains(tmpTitleInput)).to.equal(true);
				return new Promise((fResolve) => { tmpView.savePromptTitle(); setTimeout(fResolve, 30); });
			})
			.then(() => tmpHarness.view._provider.listPrompts())
			.then((pPrompts) => { libExpect(pPrompts[0].Title).to.equal('After <b>edit</b>'); });
	});

	test('a custom data provider replaces the in-memory default', function ()
	{
		let tmpCalls = [];
		class SpyProvider extends libPromptEditor.InMemoryPromptProvider
		{
			listPrompts() { tmpCalls.push('listPrompts'); return super.listPrompts(); }
		}
		return freshSection({ DataProvider: new SpyProvider({}) })
			.then(({ view }) =>
			{
				libExpect(view._provider).to.be.instanceOf(SpyProvider);
				libExpect(tmpCalls).to.contain('listPrompts');
			});
	});

	test('hooks fire on prompt save with the saved record', function ()
	{
		let tmpEvents = [];
		let tmpHarness;
		return freshSection(
			{
				onPromptSaved: (pPrompt) => tmpEvents.push('saved:' + pPrompt.Title),
				onChange: (pChange) => tmpEvents.push('change:' + pChange.Event)
			})
			.then((pHarness) =>
			{
				tmpHarness = pHarness;
				tmpHarness.view.newPrompt();
				return new Promise((fResolve) => setTimeout(fResolve, 50));
			})
			.then(() =>
			{
				libExpect(tmpEvents).to.contain('saved:Untitled prompt');
				libExpect(tmpEvents).to.contain('change:PromptSaved');
			});
	});

	test('two sections on one page keep separate stores', function ()
	{
		let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
		document.body.innerHTML = '<div id="A"></div><div id="B"></div>';
		tmpPict.addView('EditorA', Object.assign({}, libPromptEditor.default_configuration, { DefaultDestinationAddress: '#A' }), libPromptEditor);
		tmpPict.addView('EditorB', Object.assign({}, libPromptEditor.default_configuration, { DefaultDestinationAddress: '#B' }), libPromptEditor);
		let tmpA = tmpPict.views['EditorA'];
		let tmpB = tmpPict.views['EditorB'];
		return new Promise((fResolve) => tmpA.initializeAsync(() => tmpB.initializeAsync(fResolve)))
			.then(() => tmpA._provider.createPrompt({ TypeKey: 'freeform', Title: 'only in A' }))
			.then(() => Promise.all([tmpA._provider.listPrompts(), tmpB._provider.listPrompts()]))
			.then((pResults) =>
			{
				libExpect(pResults[0]).to.have.length(1);
				libExpect(pResults[1]).to.have.length(0);
			});
	});
});
