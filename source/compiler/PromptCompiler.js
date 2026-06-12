'use strict';

/**
 * PromptCompiler: a prompt record + its type --> markdown.
 *
 * Two stages, deliberately separate:
 *
 *   assembleSource() stitches the segments into one markdown document, fixed
 *   preambles included, template expressions left intact. This is the SOURCE
 *   of a prompt -- what you version, diff, and collaborate on.
 *
 *   generate() runs that source through the pict template engine with the
 *   word lists in the parse data, so {~WordListEntry:Name~} resolves by
 *   weighted random and every other pict expression works too (the prompt
 *   record itself is addressable: {~D:Prompt.Title~}). Each call is one
 *   concrete generation; call it as many times as you like.
 */

/**
 * Filesystem-friendly slug for zip entry names.
 * @param {string} pText
 * @returns {string}
 */
function slug(pText)
{
	return String(pText || '').toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60) || 'prompt';
}

/**
 * Assemble a prompt's markdown source from its type's segments.
 *
 * Segment headings (## Context and friends) are on by default; a prompt that
 * carries IncludeSegmentHeadings: false compiles bare segment bodies instead,
 * so the author decides per prompt whether the structure shows in the output.
 * The document title heading stays governed by the IncludeTitleHeading option.
 *
 * @param {object} pPrompt - the prompt record
 * @param {object} pType - the resolved prompt type
 * @param {object} [pOptions] - { IncludeTitleHeading: true, SegmentHeadingLevel: 2 }
 * @returns {string} markdown with template expressions intact
 */
function assembleSource(pPrompt, pType, pOptions)
{
	let tmpOptions = pOptions || {};
	let tmpIncludeTitle = (typeof tmpOptions.IncludeTitleHeading === 'undefined') ? true : !!tmpOptions.IncludeTitleHeading;
	let tmpIncludeSegmentHeadings = !(pPrompt && pPrompt.IncludeSegmentHeadings === false);
	let tmpHeading = '#'.repeat(Math.max(1, Math.min(6, Number(tmpOptions.SegmentHeadingLevel) || 2)));
	let tmpSegments = (pType && Array.isArray(pType.Segments)) ? pType.Segments : [];
	let tmpBodies = (pPrompt && pPrompt.Segments) ? pPrompt.Segments : {};

	let tmpParts = [];
	if (tmpIncludeTitle && pPrompt && pPrompt.Title)
	{
		tmpParts.push('# ' + String(pPrompt.Title).trim());
	}

	for (let i = 0; i < tmpSegments.length; i++)
	{
		let tmpSegment = tmpSegments[i];
		let tmpBody = tmpSegment.Fixed ? String(tmpSegment.Body || '') : String(tmpBodies[tmpSegment.Key] || '');
		tmpBody = tmpBody.trim();
		if (!tmpBody)
		{
			if (tmpSegment.Optional || tmpSegment.Fixed) { continue; }
			tmpBody = '(nothing written for this segment yet)';
		}
		tmpParts.push(tmpIncludeSegmentHeadings
			? (tmpHeading + ' ' + String(tmpSegment.Name || tmpSegment.Key) + '\n\n' + tmpBody)
			: tmpBody);
	}

	return tmpParts.join('\n\n') + '\n';
}

/**
 * Build the { lowercased name -> Entries } map generate() feeds the
 * {~WordListEntry:~} expression.
 * @param {Array} pWordLists - word list records
 * @returns {object}
 */
function wordListMap(pWordLists)
{
	let tmpMap = {};
	(pWordLists || []).forEach((pList) =>
	{
		let tmpName = String(pList.Name || '').trim().toLowerCase();
		if (tmpName) { tmpMap[tmpName] = pList.Entries || []; }
	});
	return tmpMap;
}

/**
 * One concrete generation: parse the assembled source through the pict
 * template engine with the word lists riding in the data record.
 * @param {object} pPict - the pict instance (its template engine does the work)
 * @param {object} pPrompt - the prompt record
 * @param {object} pType - the resolved prompt type
 * @param {Array} pWordLists - word list records in play
 * @param {object} [pOptions] - assembleSource options + { RandomFunction }
 * @returns {string} resolved markdown
 */
function generate(pPict, pPrompt, pType, pWordLists, pOptions)
{
	let tmpOptions = pOptions || {};
	let tmpSource = assembleSource(pPrompt, pType, tmpOptions);
	let tmpData =
	{
		Prompt: pPrompt,
		__PromptEditorWordLists: wordListMap(pWordLists),
		__PromptEditorRandom: (typeof tmpOptions.RandomFunction === 'function') ? tmpOptions.RandomFunction : undefined
	};
	return pPict.parseTemplate(tmpSource, tmpData, null, []);
}

/**
 * The zip entry filename for one generated prompt.
 * @param {object} pGenerated - the generated record
 * @returns {string}
 */
function generatedFileName(pGenerated)
{
	let tmpSequence = String(Number(pGenerated.Sequence) || 0).padStart(3, '0');
	return slug(pGenerated.PromptTitle) + '-' + tmpSequence + '.md';
}

module.exports = { assembleSource, generate, wordListMap, slug, generatedFileName };
