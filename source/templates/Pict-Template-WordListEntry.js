'use strict';

const libPictTemplate = require('pict-template');

/**
 * The {~WordListEntry:Name~} template expression (short form {~WLE:Name~}).
 *
 * Resolves to one entry drawn from the named word list by weighted random:
 * an entry's chance is weight / sum(weights). With Dinosaurs holding
 * [["Tyrannosaurus", 3], ["Diplodocus", 1]], the expression renders
 * Tyrannosaurus 75% of the time and Diplodocus 25%.
 *
 * Word lists are found two ways, in order:
 *
 *   1. The data record: a generation run passes the lists in the parse data as
 *      __PromptEditorWordLists ({ lowercased name -> Entries }) along with an
 *      optional __PromptEditorRandom function. This is what the prompt editor
 *      view does, and it keeps multiple editor instances exact: each
 *      generation resolves against precisely the lists it was given.
 *
 *   2. The pict-level registry: any prompt editor view (or a host) can push a
 *      resolver function onto pict.__PictSectionPromptEditorResolvers, so the
 *      expression also works in ordinary application templates once a section
 *      is mounted. Resolvers take the lowercased list name and return Entries
 *      or null.
 *
 * A second optional parameter is the default for a miss:
 * {~WordListEntry:Dinosaurs:a large lizard~} renders the default when the list
 * does not resolve (or has nothing drawable). The split is on the first colon,
 * so defaults may contain colons; an empty default ({~WLE:Name:~}) renders
 * nothing on a miss. With no default, a miss renders the expression back out
 * literally, so a typo is visible in the generated prompt instead of silently
 * vanishing. Each occurrence draws independently; two references to the same
 * list in one prompt can (and should be able to) land on different words.
 */

/**
 * Draw one word from [[word, weight], ...] by weighted random. Entries with a
 * non-positive weight never draw. Returns null for an empty or all-zero list.
 * @param {Array<Array>} pEntries
 * @param {function} [pRandom] - returns [0, 1); defaults to Math.random
 * @returns {string|null}
 */
function weightedPick(pEntries, pRandom)
{
	if (!Array.isArray(pEntries) || !pEntries.length) { return null; }
	let tmpRandom = (typeof pRandom === 'function') ? pRandom : Math.random;
	let tmpTotal = 0;
	for (let i = 0; i < pEntries.length; i++)
	{
		let tmpWeight = Number(pEntries[i][1]);
		if (isFinite(tmpWeight) && tmpWeight > 0) { tmpTotal += tmpWeight; }
	}
	if (tmpTotal <= 0) { return null; }
	let tmpRoll = tmpRandom() * tmpTotal;
	for (let i = 0; i < pEntries.length; i++)
	{
		let tmpWeight = Number(pEntries[i][1]);
		if (!isFinite(tmpWeight) || tmpWeight <= 0) { continue; }
		tmpRoll -= tmpWeight;
		if (tmpRoll < 0) { return String(pEntries[i][0]); }
	}
	// Floating point edge: the roll landed exactly on the total.
	for (let i = pEntries.length - 1; i >= 0; i--)
	{
		if (Number(pEntries[i][1]) > 0) { return String(pEntries[i][0]); }
	}
	return null;
}

class PictTemplateWordListEntry extends libPictTemplate
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.addPattern('{~WordListEntry:', '~}');
		this.addPattern('{~WLE:', '~}');
	}

	render(pTemplateHash, pRecord)
	{
		let tmpBody = String(pTemplateHash || '').trim();
		if (!tmpBody) { return ''; }

		// {~WordListEntry:ListName:Default~} -- everything after the FIRST colon
		// is the default rendered when the list does not resolve (or resolves
		// with nothing drawable). The default may contain colons, and may be
		// empty: {~WLE:Name:~} renders nothing on a miss. With no default at
		// all, a miss echoes the expression so a typo stays findable.
		let tmpListName = tmpBody;
		let tmpDefault = null;
		let tmpColon = tmpBody.indexOf(':');
		if (tmpColon > -1)
		{
			tmpListName = tmpBody.slice(0, tmpColon).trim();
			tmpDefault = tmpBody.slice(tmpColon + 1).trim();
		}
		if (!tmpListName) { return (tmpDefault === null) ? '' : tmpDefault; }
		let tmpWanted = tmpListName.toLowerCase();
		let tmpMiss = (tmpDefault === null) ? ('{~WordListEntry:' + tmpListName + '~}') : tmpDefault;

		let tmpEntries = null;
		let tmpRandom = null;

		// 1. Lists riding in the parse data (a generation run).
		if (pRecord && pRecord.__PromptEditorWordLists && pRecord.__PromptEditorWordLists[tmpWanted])
		{
			tmpEntries = pRecord.__PromptEditorWordLists[tmpWanted];
		}
		if (pRecord && typeof pRecord.__PromptEditorRandom === 'function')
		{
			tmpRandom = pRecord.__PromptEditorRandom;
		}

		// 2. The pict-level resolver registry (mounted sections, host overrides).
		if (!tmpEntries && this.pict && Array.isArray(this.pict.__PictSectionPromptEditorResolvers))
		{
			for (let i = 0; i < this.pict.__PictSectionPromptEditorResolvers.length; i++)
			{
				let tmpResolved = null;
				try { tmpResolved = this.pict.__PictSectionPromptEditorResolvers[i](tmpWanted); }
				catch (pError) { tmpResolved = null; }
				if (tmpResolved && tmpResolved.length) { tmpEntries = tmpResolved; break; }
			}
		}

		if (!tmpEntries || !tmpEntries.length)
		{
			return tmpMiss;
		}

		let tmpWord = weightedPick(tmpEntries, tmpRandom);
		return (tmpWord === null) ? tmpMiss : tmpWord;
	}
}

module.exports = PictTemplateWordListEntry;
module.exports.template_hash = 'WordListEntry';
module.exports.weightedPick = weightedPick;
