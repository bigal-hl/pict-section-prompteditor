'use strict';

const libChai = require('chai');
const libExpect = libChai.expect;

const libJSZip = require('jszip');
const libPromptZip = require('../source/zip/PromptZip.js');

suite('PromptZip', function ()
{
	test('round-trips named markdown files', function ()
	{
		return libPromptZip.buildZip(
			[
				{ Name: 'first-001.md', Content: '# One' },
				{ Name: 'second-002.md', Content: '# Two' }
			], { Type: 'nodebuffer' })
			.then((pBuffer) => libJSZip.loadAsync(pBuffer))
			.then((pZip) =>
			{
				let tmpNames = Object.keys(pZip.files).sort();
				libExpect(tmpNames).to.deep.equal(['first-001.md', 'second-002.md']);
				return pZip.files['first-001.md'].async('string');
			})
			.then((pContent) => { libExpect(pContent).to.equal('# One'); });
	});

	test('duplicate names get numeric suffixes instead of clobbering', function ()
	{
		return libPromptZip.buildZip(
			[
				{ Name: 'p-001.md', Content: 'a' },
				{ Name: 'p-001.md', Content: 'b' },
				{ Name: 'p-001.md', Content: 'c' }
			], { Type: 'nodebuffer' })
			.then((pBuffer) => libJSZip.loadAsync(pBuffer))
			.then((pZip) =>
			{
				let tmpNames = Object.keys(pZip.files).sort();
				libExpect(tmpNames).to.deep.equal(['p-001-2.md', 'p-001-3.md', 'p-001.md']);
			});
	});
});
