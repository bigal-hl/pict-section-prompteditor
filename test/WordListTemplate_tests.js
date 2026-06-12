'use strict';

// The template tests stand up a real pict instance, which wants a DOM-ish
// environment; jsdom provides one before pict is required.
const { JSDOM } = require('jsdom');
let _DOM = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = _DOM.window;
global.document = _DOM.window.document;

const libChai = require('chai');
const libExpect = libChai.expect;

const libPict = require('pict');
const libWordListTemplate = require('../source/templates/Pict-Template-WordListEntry.js');
const weightedPick = libWordListTemplate.weightedPick;

function freshPict()
{
	let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
	tmpPict.addTemplate(libWordListTemplate);
	return tmpPict;
}

// A deterministic "random" that walks a fixed sequence.
function sequenceRandom(pValues)
{
	let tmpIndex = 0;
	return () => pValues[(tmpIndex++) % pValues.length];
}

const _DINOSAURS = [['Tyrannosaurus', 3], ['Diplodocus', 1]];

suite('weightedPick', function ()
{
	test('respects weights: 3/1 splits at 75%', function ()
	{
		// total 4; rolls below 3 land on Tyrannosaurus, 3 and above on Diplodocus
		libExpect(weightedPick(_DINOSAURS, () => 0.0)).to.equal('Tyrannosaurus');
		libExpect(weightedPick(_DINOSAURS, () => 0.74)).to.equal('Tyrannosaurus');
		libExpect(weightedPick(_DINOSAURS, () => 0.75)).to.equal('Diplodocus');
		libExpect(weightedPick(_DINOSAURS, () => 0.99)).to.equal('Diplodocus');
	});

	test('zero-weight entries never draw', function ()
	{
		let tmpEntries = [['never', 0], ['always', 1]];
		for (let tmpRoll of [0.0, 0.5, 0.99])
		{
			libExpect(weightedPick(tmpEntries, () => tmpRoll)).to.equal('always');
		}
	});

	test('empty and all-zero lists return null', function ()
	{
		libExpect(weightedPick([], Math.random)).to.equal(null);
		libExpect(weightedPick([['a', 0]], Math.random)).to.equal(null);
	});

	test('distribution sanity over a uniform sweep', function ()
	{
		let tmpCounts = { Tyrannosaurus: 0, Diplodocus: 0 };
		for (let i = 0; i < 1000; i++)
		{
			tmpCounts[weightedPick(_DINOSAURS, () => i / 1000)]++;
		}
		libExpect(tmpCounts.Tyrannosaurus).to.equal(750);
		libExpect(tmpCounts.Diplodocus).to.equal(250);
	});
});

suite('{~WordListEntry:~} template expression', function ()
{
	test('resolves from word lists riding in the parse data', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('I choose {~WordListEntry:Dinosaurs~}!',
			{
				__PromptEditorWordLists: { dinosaurs: _DINOSAURS },
				__PromptEditorRandom: () => 0.9
			}, null, []);
		libExpect(tmpResult).to.equal('I choose Diplodocus!');
	});

	test('the short form {~WLE:~} works and list names are case-insensitive', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~WLE:dInOsAuRs~}',
			{ __PromptEditorWordLists: { dinosaurs: _DINOSAURS }, __PromptEditorRandom: () => 0.0 }, null, []);
		libExpect(tmpResult).to.equal('Tyrannosaurus');
	});

	test('each occurrence draws independently', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~WordListEntry:Dinosaurs~} vs {~WordListEntry:Dinosaurs~}',
			{
				__PromptEditorWordLists: { dinosaurs: _DINOSAURS },
				__PromptEditorRandom: sequenceRandom([0.0, 0.9])
			}, null, []);
		libExpect(tmpResult).to.equal('Tyrannosaurus vs Diplodocus');
	});

	test('an unknown list renders the expression back out literally', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~WordListEntry:Mammals~}', { __PromptEditorWordLists: {} }, null, []);
		libExpect(tmpResult).to.equal('{~WordListEntry:Mammals~}');
	});

	test('a second parameter is the default on a miss', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('A {~WordListEntry:Mammals:large lizard~} appears.', { __PromptEditorWordLists: {} }, null, []);
		libExpect(tmpResult).to.equal('A large lizard appears.');
	});

	test('the default works through the short form and may contain colons', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~WLE:Mammals:see: the field guide~}', { __PromptEditorWordLists: {} }, null, []);
		libExpect(tmpResult).to.equal('see: the field guide');
	});

	test('an empty default renders nothing on a miss', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('[{~WordListEntry:Mammals:~}]', { __PromptEditorWordLists: {} }, null, []);
		libExpect(tmpResult).to.equal('[]');
	});

	test('the default is ignored when the list resolves', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~WordListEntry:Dinosaurs:fallback~}',
			{ __PromptEditorWordLists: { dinosaurs: _DINOSAURS }, __PromptEditorRandom: () => 0.0 }, null, []);
		libExpect(tmpResult).to.equal('Tyrannosaurus');
	});

	test('the default covers a list with nothing drawable (all zero weights)', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~WordListEntry:Ghosts:nobody~}',
			{ __PromptEditorWordLists: { ghosts: [['phantom', 0]] } }, null, []);
		libExpect(tmpResult).to.equal('nobody');
	});

	test('falls back to the pict-level resolver registry', function ()
	{
		let tmpPict = freshPict();
		tmpPict.__PictSectionPromptEditorResolvers = [
			(pName) => (pName === 'tools' ? [['hammer', 1]] : null)
		];
		let tmpResult = tmpPict.parseTemplate('Grab the {~WordListEntry:Tools~}.', {}, null, []);
		libExpect(tmpResult).to.equal('Grab the hammer.');
	});

	test('coexists with stock pict expressions in one parse', function ()
	{
		let tmpPict = freshPict();
		let tmpResult = tmpPict.parseTemplate('{~D:Record.Title~}: {~WordListEntry:Dinosaurs~}',
			{
				Title: 'Pick',
				__PromptEditorWordLists: { dinosaurs: _DINOSAURS },
				__PromptEditorRandom: () => 0.0
			}, null, []);
		libExpect(tmpResult).to.equal('Pick: Tyrannosaurus');
	});
});
