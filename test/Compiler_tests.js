'use strict';

const { JSDOM } = require('jsdom');
let _DOM = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = _DOM.window;
global.document = _DOM.window.document;

const libChai = require('chai');
const libExpect = libChai.expect;

const libPict = require('pict');
const libCompiler = require('../source/compiler/PromptCompiler.js');
const libTypes = require('../source/types/PromptEditor-DefaultTypes.js');
const libWordListTemplate = require('../source/templates/Pict-Template-WordListEntry.js');

const _FEATURE_REQUEST = libTypes.DefaultPromptTypes.find((pType) => pType.Key === 'feature-request');

function freshPict()
{
	let tmpPict = new libPict({ LogStreams: [{ streamtype: 'null', level: 'error' }] });
	tmpPict.addTemplate(libWordListTemplate);
	return tmpPict;
}

suite('PromptCompiler', function ()
{
	suite('assembleSource', function ()
	{
		test('title heading plus one heading per written segment', function ()
		{
			let tmpPrompt =
			{
				Title: 'Add the thing',
				TypeKey: 'feature-request',
				Segments: { 'context': 'We have a system.', 'request': 'Add a thing.', 'success-criteria': 'The thing exists.' }
			};
			let tmpSource = libCompiler.assembleSource(tmpPrompt, _FEATURE_REQUEST);
			libExpect(tmpSource).to.contain('# Add the thing');
			libExpect(tmpSource).to.contain('## Context\n\nWe have a system.');
			libExpect(tmpSource).to.contain('## Request\n\nAdd a thing.');
			libExpect(tmpSource).to.contain('## Success Criteria\n\nThe thing exists.');
		});

		test('empty optional segments are skipped; empty required ones get a placeholder', function ()
		{
			let tmpType =
			{
				Key: 't', Name: 'T',
				Segments:
				[
					{ Key: 'req', Name: 'Required' },
					{ Key: 'opt', Name: 'Optional', Optional: true }
				]
			};
			let tmpSource = libCompiler.assembleSource({ Title: 'X', Segments: {} }, tmpType);
			libExpect(tmpSource).to.contain('## Required\n\n(nothing written for this segment yet)');
			libExpect(tmpSource).to.not.contain('## Optional');
		});

		test('fixed segments use the type body, ignoring any prompt segment text', function ()
		{
			let tmpType =
			{
				Key: 't', Name: 'T',
				Segments:
				[
					{ Key: 'preamble', Name: 'Preamble', Fixed: true, Body: 'Always begin politely.' },
					{ Key: 'body', Name: 'Body' }
				]
			};
			let tmpPrompt = { Title: 'X', Segments: { 'preamble': 'IGNORED', 'body': 'Hello.' } };
			let tmpSource = libCompiler.assembleSource(tmpPrompt, tmpType);
			libExpect(tmpSource).to.contain('## Preamble\n\nAlways begin politely.');
			libExpect(tmpSource).to.not.contain('IGNORED');
		});

		test('options control the title heading and segment heading level', function ()
		{
			let tmpSource = libCompiler.assembleSource(
				{ Title: 'X', Segments: { 'body': 'Hi.' } },
				{ Key: 'f', Name: 'F', Segments: [{ Key: 'body', Name: 'Prompt' }] },
				{ IncludeTitleHeading: false, SegmentHeadingLevel: 3 });
			libExpect(tmpSource).to.not.contain('# X');
			libExpect(tmpSource).to.contain('### Prompt');
		});
	});

	suite('generate', function ()
	{
		test('resolves word list expressions and pict data expressions', function ()
		{
			let tmpPict = freshPict();
			let tmpPrompt =
			{
				Title: 'Dinosaur care',
				TypeKey: 'freeform',
				Segments: { 'body': 'Feed the {~WordListEntry:Dinosaurs~} as described in "{~D:Record.Prompt.Title~}".' }
			};
			let tmpType = libTypes.getPromptType(libTypes.DefaultPromptTypes, 'freeform');
			let tmpWordLists = [{ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]] }];
			let tmpMarkdown = libCompiler.generate(tmpPict, tmpPrompt, tmpType, tmpWordLists, { RandomFunction: () => 0.9 });
			libExpect(tmpMarkdown).to.contain('Feed the Diplodocus as described in "Dinosaur care".');
		});

		test('two generations with different rolls differ', function ()
		{
			let tmpPict = freshPict();
			let tmpPrompt = { Title: 'P', TypeKey: 'freeform', Segments: { 'body': '{~WordListEntry:Dinosaurs~}' } };
			let tmpType = libTypes.getPromptType(libTypes.DefaultPromptTypes, 'freeform');
			let tmpWordLists = [{ Name: 'Dinosaurs', Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]] }];
			let tmpFirst = libCompiler.generate(tmpPict, tmpPrompt, tmpType, tmpWordLists, { RandomFunction: () => 0.0 });
			let tmpSecond = libCompiler.generate(tmpPict, tmpPrompt, tmpType, tmpWordLists, { RandomFunction: () => 0.9 });
			libExpect(tmpFirst).to.contain('Tyrannosaurus');
			libExpect(tmpSecond).to.contain('Diplodocus');
		});
	});

	suite('names', function ()
	{
		test('slug and generatedFileName produce filesystem-friendly names', function ()
		{
			libExpect(libCompiler.slug('Add the Thing! (v2)')).to.equal('add-the-thing-v2');
			libExpect(libCompiler.generatedFileName({ PromptTitle: 'Add the Thing!', Sequence: 7 })).to.equal('add-the-thing-007.md');
		});
	});

	suite('prompt types', function ()
	{
		test('defaults include the feature-request shape with the three canonical segments', function ()
		{
			libExpect(_FEATURE_REQUEST).to.exist;
			libExpect(_FEATURE_REQUEST.Segments.map((pSegment) => pSegment.Key)).to.deep.equal(['context', 'request', 'success-criteria']);
		});

		test('a configured set replaces the defaults outright', function ()
		{
			let tmpMine = [{ Key: 'mine', Name: 'Mine', Segments: [{ Key: 'b', Name: 'B' }] }];
			libExpect(libTypes.resolvePromptTypes(tmpMine)).to.equal(tmpMine);
			libExpect(libTypes.resolvePromptTypes(null)).to.equal(libTypes.DefaultPromptTypes);
		});

		test('an unknown type key degrades to a freeform-style shape', function ()
		{
			let tmpType = libTypes.getPromptType(libTypes.DefaultPromptTypes, 'vanished');
			libExpect(tmpType.Segments).to.have.length(1);
		});
	});
});
