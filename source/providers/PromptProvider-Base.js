'use strict';

/**
 * The data seam for pict-section-prompteditor.
 *
 * PromptDataProvider is the interface a host implements to map prompts, word
 * lists, and generated output onto its own back end (a REST API, meadow
 * entities, local storage, whatever). InMemoryPromptProvider is the default:
 * everything lives in a plain object store (usually a node of pict AppData),
 * so the section works with no server at all.
 *
 * Three record families:
 *
 *   WordList   { Key, Name, Entries: [[word, weight], ...], CreatedAt, UpdatedAt }
 *     A curated word matrix. Weights default to 1; an entry's chance of being
 *     drawn by {~WordListEntry:Name~} is weight / sum(weights).
 *
 *   Prompt     { Key, Title, TypeKey, Segments: { segmentKey: markdown },
 *                Author, Meta, CreatedAt, UpdatedAt }
 *     A crafted prompt. Segments hold the markdown for each of the prompt
 *     type's segments, keyed by segment Key. Meta is an opaque object the
 *     provider round-trips untouched -- the seam where a host hangs ratings,
 *     version pointers, or anything else.
 *
 *   Generated  { Key, PromptKey, PromptTitle, TypeKey, Markdown, Sequence,
 *                Author, GeneratedAt }
 *     One concrete generation of a prompt: the assembled markdown with every
 *     template expression (word lists included) resolved.
 *
 * All primitives return Promises so a remote provider drops in cleanly.
 */

/**
 * Normalize a word list's Entries into [[word, weight], ...] pairs. Accepts
 * pairs, bare strings, or {Word, Weight} objects; weights default to 1 and
 * coerce to a non-negative number.
 * @param {Array} pEntries
 * @returns {Array<Array>}
 */
function normalizeEntries(pEntries)
{
	if (!Array.isArray(pEntries)) { return []; }
	let tmpOut = [];
	for (let i = 0; i < pEntries.length; i++)
	{
		let tmpEntry = pEntries[i];
		let tmpWord = '';
		let tmpWeight = 1;
		if (Array.isArray(tmpEntry))
		{
			tmpWord = String(tmpEntry[0] == null ? '' : tmpEntry[0]);
			tmpWeight = (typeof tmpEntry[1] === 'undefined' || tmpEntry[1] === null || tmpEntry[1] === '') ? 1 : Number(tmpEntry[1]);
		}
		else if (tmpEntry && typeof tmpEntry === 'object')
		{
			tmpWord = String(tmpEntry.Word == null ? '' : tmpEntry.Word);
			tmpWeight = (typeof tmpEntry.Weight === 'undefined' || tmpEntry.Weight === null || tmpEntry.Weight === '') ? 1 : Number(tmpEntry.Weight);
		}
		else
		{
			tmpWord = String(tmpEntry == null ? '' : tmpEntry);
		}
		if (!isFinite(tmpWeight) || tmpWeight < 0) { tmpWeight = 1; }
		tmpOut.push([tmpWord, tmpWeight]);
	}
	return tmpOut;
}

class PromptDataProvider
{
	constructor(pOptions)
	{
		this.options = pOptions || {};
		this._now = (typeof this.options.Now === 'function') ? this.options.Now : Date.now;
		let tmpCounter = 0;
		this._key = (typeof this.options.KeyGenerator === 'function') ? this.options.KeyGenerator : (pPrefix) =>
		{
			tmpCounter++;
			return (pPrefix || 'pe') + '_' + this._now().toString(36) + '_' + tmpCounter.toString(36) + '_' + Math.floor(Math.random() * 1679616).toString(36);
		};
	}

	/* eslint-disable no-unused-vars */
	// ---- word lists ---------------------------------------------------------
	listWordLists() { return Promise.reject(new Error('listWordLists not implemented')); }
	createWordList(pDraft) { return Promise.reject(new Error('createWordList not implemented')); }
	updateWordList(pKey, pPatch) { return Promise.reject(new Error('updateWordList not implemented')); }
	deleteWordList(pKey) { return Promise.reject(new Error('deleteWordList not implemented')); }

	// ---- prompts ------------------------------------------------------------
	listPrompts() { return Promise.reject(new Error('listPrompts not implemented')); }
	createPrompt(pDraft) { return Promise.reject(new Error('createPrompt not implemented')); }
	updatePrompt(pKey, pPatch) { return Promise.reject(new Error('updatePrompt not implemented')); }
	deletePrompt(pKey) { return Promise.reject(new Error('deletePrompt not implemented')); }

	// ---- generated output ---------------------------------------------------
	listGenerated(pPromptKey) { return Promise.reject(new Error('listGenerated not implemented')); }
	createGenerated(pDraft) { return Promise.reject(new Error('createGenerated not implemented')); }
	deleteGenerated(pKey) { return Promise.reject(new Error('deleteGenerated not implemented')); }
	clearGenerated(pPromptKey) { return Promise.reject(new Error('clearGenerated not implemented')); }
	/* eslint-enable no-unused-vars */

	// ---- conveniences built on the primitives -------------------------------
	/**
	 * Load everything the section renders, in one call.
	 * @returns {Promise<{WordLists: Array, Prompts: Array, Generated: Array}>}
	 */
	loadAll()
	{
		return Promise.all([this.listWordLists(), this.listPrompts(), this.listGenerated()])
			.then((pResults) => ({ WordLists: pResults[0], Prompts: pResults[1], Generated: pResults[2] }));
	}

	/**
	 * Find a word list by Name (trimmed, case-insensitive). The lookup the
	 * {~WordListEntry:Name~} expression leans on.
	 * @param {string} pName
	 * @returns {Promise<object|null>}
	 */
	getWordListByName(pName)
	{
		let tmpWanted = String(pName || '').trim().toLowerCase();
		return this.listWordLists().then((pLists) =>
			pLists.find((pList) => String(pList.Name || '').trim().toLowerCase() === tmpWanted) || null);
	}
}

class InMemoryPromptProvider extends PromptDataProvider
{
	constructor(pOptions)
	{
		super(pOptions);
		// The store is usually a node of pict AppData (so state is observable
		// and survives view re-renders); a fresh object works fine too.
		let tmpStore = (this.options && this.options.Store) ? this.options.Store : {};
		if (!tmpStore.WordLists) { tmpStore.WordLists = {}; }
		if (!tmpStore.Prompts) { tmpStore.Prompts = {}; }
		if (!tmpStore.Generated) { tmpStore.Generated = {}; }
		this.store = tmpStore;
	}

	_clone(pValue) { return (pValue == null) ? pValue : JSON.parse(JSON.stringify(pValue)); }

	// ---- word lists ---------------------------------------------------------
	listWordLists()
	{
		let tmpLists = Object.values(this.store.WordLists).map((pList) => this._clone(pList));
		tmpLists.sort((pA, pB) => String(pA.Name).localeCompare(String(pB.Name)));
		return Promise.resolve(tmpLists);
	}

	createWordList(pDraft)
	{
		let tmpDraft = pDraft || {};
		let tmpName = String(tmpDraft.Name || '').trim();
		if (!tmpName) { return Promise.reject(new Error('A word list needs a Name.')); }
		let tmpNow = this._now();
		let tmpList =
		{
			Key: tmpDraft.Key || this._key('wl'),
			Name: tmpName,
			Entries: normalizeEntries(tmpDraft.Entries),
			CreatedAt: tmpNow,
			UpdatedAt: tmpNow
		};
		this.store.WordLists[tmpList.Key] = tmpList;
		return Promise.resolve(this._clone(tmpList));
	}

	updateWordList(pKey, pPatch)
	{
		let tmpList = this.store.WordLists[pKey];
		if (!tmpList) { return Promise.reject(new Error('No word list with Key ' + pKey)); }
		let tmpPatch = pPatch || {};
		if (typeof tmpPatch.Name !== 'undefined')
		{
			let tmpName = String(tmpPatch.Name || '').trim();
			if (!tmpName) { return Promise.reject(new Error('A word list needs a Name.')); }
			tmpList.Name = tmpName;
		}
		if (typeof tmpPatch.Entries !== 'undefined') { tmpList.Entries = normalizeEntries(tmpPatch.Entries); }
		tmpList.UpdatedAt = this._now();
		return Promise.resolve(this._clone(tmpList));
	}

	deleteWordList(pKey)
	{
		delete this.store.WordLists[pKey];
		return Promise.resolve();
	}

	// ---- prompts ------------------------------------------------------------
	listPrompts()
	{
		let tmpPrompts = Object.values(this.store.Prompts).map((pPrompt) => this._clone(pPrompt));
		tmpPrompts.sort((pA, pB) => (pB.UpdatedAt || 0) - (pA.UpdatedAt || 0));
		return Promise.resolve(tmpPrompts);
	}

	createPrompt(pDraft)
	{
		let tmpDraft = pDraft || {};
		if (!tmpDraft.TypeKey) { return Promise.reject(new Error('A prompt needs a TypeKey.')); }
		let tmpNow = this._now();
		let tmpPrompt =
		{
			Key: tmpDraft.Key || this._key('pr'),
			Title: String(tmpDraft.Title || 'Untitled prompt'),
			TypeKey: String(tmpDraft.TypeKey),
			Segments: (tmpDraft.Segments && typeof tmpDraft.Segments === 'object') ? this._clone(tmpDraft.Segments) : {},
			Author: tmpDraft.Author || null,
			Meta: (typeof tmpDraft.Meta === 'undefined') ? {} : this._clone(tmpDraft.Meta),
			CreatedAt: tmpNow,
			UpdatedAt: tmpNow
		};
		this.store.Prompts[tmpPrompt.Key] = tmpPrompt;
		return Promise.resolve(this._clone(tmpPrompt));
	}

	updatePrompt(pKey, pPatch)
	{
		let tmpPrompt = this.store.Prompts[pKey];
		if (!tmpPrompt) { return Promise.reject(new Error('No prompt with Key ' + pKey)); }
		let tmpPatch = pPatch || {};
		if (typeof tmpPatch.Title !== 'undefined') { tmpPrompt.Title = String(tmpPatch.Title); }
		if (typeof tmpPatch.TypeKey !== 'undefined') { tmpPrompt.TypeKey = String(tmpPatch.TypeKey); }
		if (typeof tmpPatch.Segments !== 'undefined') { tmpPrompt.Segments = this._clone(tmpPatch.Segments || {}); }
		if (typeof tmpPatch.Meta !== 'undefined') { tmpPrompt.Meta = this._clone(tmpPatch.Meta); }
		tmpPrompt.UpdatedAt = this._now();
		return Promise.resolve(this._clone(tmpPrompt));
	}

	deletePrompt(pKey)
	{
		delete this.store.Prompts[pKey];
		// Generated output belongs to its prompt; remove it alongside.
		for (let tmpGenKey of Object.keys(this.store.Generated))
		{
			if (this.store.Generated[tmpGenKey].PromptKey === pKey) { delete this.store.Generated[tmpGenKey]; }
		}
		return Promise.resolve();
	}

	// ---- generated output ---------------------------------------------------
	listGenerated(pPromptKey)
	{
		let tmpGenerated = Object.values(this.store.Generated)
			.filter((pGen) => !pPromptKey || pGen.PromptKey === pPromptKey)
			.map((pGen) => this._clone(pGen));
		// Ordered like a file listing: the prompt with the most recent
		// generation first, and within a prompt the files in sequence order
		// (001 at the top), matching the names they get in the zip.
		let tmpLatestByPrompt = {};
		tmpGenerated.forEach((pGen) =>
		{
			let tmpStamp = pGen.GeneratedAt || 0;
			if (!(pGen.PromptKey in tmpLatestByPrompt) || tmpStamp > tmpLatestByPrompt[pGen.PromptKey]) { tmpLatestByPrompt[pGen.PromptKey] = tmpStamp; }
		});
		tmpGenerated.sort((pA, pB) =>
			(tmpLatestByPrompt[pB.PromptKey] - tmpLatestByPrompt[pA.PromptKey])
			|| String(pA.PromptKey).localeCompare(String(pB.PromptKey))
			|| (pA.Sequence || 0) - (pB.Sequence || 0)
			|| (pA.GeneratedAt || 0) - (pB.GeneratedAt || 0));
		return Promise.resolve(tmpGenerated);
	}

	createGenerated(pDraft)
	{
		let tmpDraft = pDraft || {};
		if (!tmpDraft.PromptKey) { return Promise.reject(new Error('Generated output needs a PromptKey.')); }
		let tmpGenerated =
		{
			Key: tmpDraft.Key || this._key('gen'),
			PromptKey: tmpDraft.PromptKey,
			PromptTitle: String(tmpDraft.PromptTitle || ''),
			TypeKey: String(tmpDraft.TypeKey || ''),
			Markdown: String(tmpDraft.Markdown || ''),
			Sequence: Number(tmpDraft.Sequence) || 0,
			Author: tmpDraft.Author || null,
			GeneratedAt: this._now()
		};
		this.store.Generated[tmpGenerated.Key] = tmpGenerated;
		return Promise.resolve(this._clone(tmpGenerated));
	}

	deleteGenerated(pKey)
	{
		delete this.store.Generated[pKey];
		return Promise.resolve();
	}

	clearGenerated(pPromptKey)
	{
		for (let tmpKey of Object.keys(this.store.Generated))
		{
			if (!pPromptKey || this.store.Generated[tmpKey].PromptKey === pPromptKey) { delete this.store.Generated[tmpKey]; }
		}
		return Promise.resolve();
	}
}

module.exports = { PromptDataProvider, InMemoryPromptProvider, normalizeEntries };
