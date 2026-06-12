'use strict';

const libChai = require('chai');
const libExpect = libChai.expect;

const libProvider = require('../source/providers/PromptProvider-Base.js');
const InMemoryPromptProvider = libProvider.InMemoryPromptProvider;

function freshProvider(pExtra)
{
	let tmpClock = { t: 1000 };
	let tmpCounter = { n: 0 };
	return new InMemoryPromptProvider(Object.assign(
		{
			Now: () => tmpClock.t++,
			KeyGenerator: (pPrefix) => { tmpCounter.n++; return (pPrefix || 'k') + tmpCounter.n; }
		}, pExtra || {}));
}

suite('PromptProvider', function ()
{
	suite('word lists', function ()
	{
		test('a fresh store has no word lists', function ()
		{
			return freshProvider().listWordLists().then((pLists) =>
			{
				libExpect(pLists).to.be.an('array').with.length(0);
			});
		});

		test('createWordList requires a name', function ()
		{
			return freshProvider().createWordList({ Entries: [['a', 1]] }).then(
				() => { throw new Error('should have rejected'); },
				(pError) => { libExpect(pError.message).to.match(/Name/); });
		});

		test('entries normalize: bare strings get weight 1, pairs keep weights', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createWordList({ Name: 'Dinosaurs', Entries: ['Diplodocus', ['Tyrannosaurus', 3], { Word: 'Stegosaurus', Weight: 2 }] })
				.then((pList) =>
				{
					libExpect(pList.Entries).to.deep.equal([['Diplodocus', 1], ['Tyrannosaurus', 3], ['Stegosaurus', 2]]);
				});
		});

		test('bad weights coerce to 1', function ()
		{
			return freshProvider().createWordList({ Name: 'L', Entries: [['a', 'nope'], ['b', -4]] }).then((pList) =>
			{
				libExpect(pList.Entries).to.deep.equal([['a', 1], ['b', 1]]);
			});
		});

		test('update patches name and entries, bumps UpdatedAt', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createWordList({ Name: 'Old', Entries: [['a', 1]] })
				.then((pList) => tmpProvider.updateWordList(pList.Key, { Name: 'New', Entries: [['b', 2]] }))
				.then((pUpdated) =>
				{
					libExpect(pUpdated.Name).to.equal('New');
					libExpect(pUpdated.Entries).to.deep.equal([['b', 2]]);
					libExpect(pUpdated.UpdatedAt).to.be.greaterThan(pUpdated.CreatedAt);
				});
		});

		test('getWordListByName is trimmed and case-insensitive', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createWordList({ Name: 'Dinosaurs', Entries: [['T', 1]] })
				.then(() => tmpProvider.getWordListByName('  dInOsAuRs '))
				.then((pList) => { libExpect(pList).to.not.equal(null); libExpect(pList.Name).to.equal('Dinosaurs'); });
		});

		test('returned records are clones; mutating them does not touch the store', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createWordList({ Name: 'L', Entries: [['a', 1]] })
				.then((pList) => { pList.Entries.push(['hacked', 99]); return tmpProvider.listWordLists(); })
				.then((pLists) => { libExpect(pLists[0].Entries).to.deep.equal([['a', 1]]); });
		});
	});

	suite('prompts', function ()
	{
		test('createPrompt requires a TypeKey and defaults the title', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createPrompt({}).then(
				() => { throw new Error('should have rejected'); },
				(pError) => { libExpect(pError.message).to.match(/TypeKey/); })
				.then(() => tmpProvider.createPrompt({ TypeKey: 'feature-request' }))
				.then((pPrompt) =>
				{
					libExpect(pPrompt.Title).to.equal('Untitled prompt');
					libExpect(pPrompt.Segments).to.deep.equal({});
					libExpect(pPrompt.Meta).to.deep.equal({});
				});
		});

		test('Meta round-trips untouched through create and update', function ()
		{
			let tmpProvider = freshProvider();
			let tmpMeta = { Rating: 4, Versions: ['a', 'b'], Anything: { Nested: true } };
			return tmpProvider.createPrompt({ TypeKey: 't', Meta: tmpMeta })
				.then((pPrompt) =>
				{
					libExpect(pPrompt.Meta).to.deep.equal(tmpMeta);
					return tmpProvider.updatePrompt(pPrompt.Key, { Title: 'Renamed' });
				})
				.then((pUpdated) => { libExpect(pUpdated.Meta).to.deep.equal(tmpMeta); });
		});

		test('prompts list newest-updated first', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createPrompt({ TypeKey: 't', Title: 'first' })
				.then(() => tmpProvider.createPrompt({ TypeKey: 't', Title: 'second' }))
				.then(() => tmpProvider.listPrompts())
				.then((pPrompts) => { libExpect(pPrompts.map((pP) => pP.Title)).to.deep.equal(['second', 'first']); });
		});

		test('deletePrompt removes its generated output too', function ()
		{
			let tmpProvider = freshProvider();
			let tmpPromptKey;
			return tmpProvider.createPrompt({ TypeKey: 't' })
				.then((pPrompt) => { tmpPromptKey = pPrompt.Key; return tmpProvider.createGenerated({ PromptKey: tmpPromptKey, Markdown: 'x' }); })
				.then(() => tmpProvider.deletePrompt(tmpPromptKey))
				.then(() => tmpProvider.listGenerated())
				.then((pGenerated) => { libExpect(pGenerated).to.have.length(0); });
		});
	});

	suite('generated output', function ()
	{
		test('listGenerated filters by prompt and lists files in sequence order', function ()
		{
			let tmpProvider = freshProvider();
			return Promise.all(
				[
					tmpProvider.createGenerated({ PromptKey: 'p1', Markdown: 'a', Sequence: 1 }),
					tmpProvider.createGenerated({ PromptKey: 'p2', Markdown: 'b', Sequence: 1 })
				])
				.then(() => tmpProvider.createGenerated({ PromptKey: 'p1', Markdown: 'c', Sequence: 2 }))
				.then(() => tmpProvider.listGenerated('p1'))
				.then((pGenerated) =>
				{
					libExpect(pGenerated).to.have.length(2);
					// 001 at the top, like the files in the zip.
					libExpect(pGenerated.map((pGen) => pGen.Markdown)).to.deep.equal(['a', 'c']);
				});
		});

		test('listGenerated groups by prompt, most recent generation first', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createGenerated({ PromptKey: 'p1', Markdown: 'a', Sequence: 1 })
				.then(() => tmpProvider.createGenerated({ PromptKey: 'p2', Markdown: 'b', Sequence: 1 }))
				.then(() => tmpProvider.createGenerated({ PromptKey: 'p1', Markdown: 'c', Sequence: 2 }))
				.then(() => tmpProvider.listGenerated())
				.then((pGenerated) =>
				{
					// p1 generated most recently, so its files lead -- in
					// sequence order -- then p2's.
					libExpect(pGenerated.map((pGen) => pGen.Markdown)).to.deep.equal(['a', 'c', 'b']);
				});
		});

		test('clearGenerated scopes to a prompt when asked', function ()
		{
			let tmpProvider = freshProvider();
			return Promise.all(
				[
					tmpProvider.createGenerated({ PromptKey: 'p1', Markdown: 'a' }),
					tmpProvider.createGenerated({ PromptKey: 'p2', Markdown: 'b' })
				])
				.then(() => tmpProvider.clearGenerated('p1'))
				.then(() => tmpProvider.listGenerated())
				.then((pGenerated) =>
				{
					libExpect(pGenerated).to.have.length(1);
					libExpect(pGenerated[0].PromptKey).to.equal('p2');
				});
		});
	});

	suite('loadAll', function ()
	{
		test('returns the three collections in one call', function ()
		{
			let tmpProvider = freshProvider();
			return tmpProvider.createWordList({ Name: 'L', Entries: [['a', 1]] })
				.then(() => tmpProvider.createPrompt({ TypeKey: 't' }))
				.then(() => tmpProvider.loadAll())
				.then((pAll) =>
				{
					libExpect(pAll.WordLists).to.have.length(1);
					libExpect(pAll.Prompts).to.have.length(1);
					libExpect(pAll.Generated).to.have.length(0);
				});
		});
	});
});
