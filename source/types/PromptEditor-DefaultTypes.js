'use strict';

/**
 * Built-in prompt types.
 *
 * A prompt type is a named arrangement of segments. Each segment:
 *
 *   {
 *     Key:      stable identifier; a prompt's Segments object is keyed by this
 *     Name:     the heading the compiler writes (## Name)
 *     Guidance: one line shown to the author about what belongs here
 *     Fixed:    true for locked text (a team preamble); Body below is used and
 *               the section renders it read-only instead of an editor
 *     Body:     the fixed text (only read when Fixed is true)
 *     Optional: empty optional segments are skipped at compile time; empty
 *               required segments compile with a placeholder note
 *   }
 *
 * These cover the common shapes of working with an AI pair. They are defaults,
 * not a registry: pass your own array as the PromptTypes option and it replaces
 * this set entirely. To extend instead of replace, spread DefaultPromptTypes
 * into your own array.
 */

const DefaultPromptTypes =
[
	{
		Key: 'feature-request',
		Name: 'Feature Request',
		Description: 'Ask for a new capability: what exists, what you want, and how you will know it worked.',
		Segments:
		[
			{ Key: 'context', Name: 'Context', Guidance: 'What exists today, where it lives, and anything the reader needs to know cold.' },
			{ Key: 'request', Name: 'Request', Guidance: 'The capability you want, stated plainly.' },
			{ Key: 'success-criteria', Name: 'Success Criteria', Guidance: 'Observable outcomes that prove it works.' }
		]
	},
	{
		Key: 'bug-report',
		Name: 'Bug Report',
		Description: 'Report something broken with enough signal to reproduce and fix it.',
		Segments:
		[
			{ Key: 'context', Name: 'Context', Guidance: 'The system, version, and environment where the problem shows.' },
			{ Key: 'observed', Name: 'Observed Behavior', Guidance: 'What actually happens, including exact errors.' },
			{ Key: 'expected', Name: 'Expected Behavior', Guidance: 'What should happen instead.' },
			{ Key: 'reproduction', Name: 'Reproduction', Guidance: 'Steps that make it happen, numbered.', Optional: true }
		]
	},
	{
		Key: 'research',
		Name: 'Research',
		Description: 'Send the AI to learn something and come back with a usable answer.',
		Segments:
		[
			{ Key: 'context', Name: 'Context', Guidance: 'Why you are asking and what you already know.' },
			{ Key: 'question', Name: 'Question', Guidance: 'The question, sharp enough to answer.' },
			{ Key: 'constraints', Name: 'Constraints', Guidance: 'Boundaries: scope, sources, time period, format.', Optional: true },
			{ Key: 'deliverable', Name: 'Deliverable', Guidance: 'The shape of the answer you want back.' }
		]
	},
	{
		Key: 'code-review',
		Name: 'Code Review',
		Description: 'Ask for a review with the focus stated up front.',
		Segments:
		[
			{ Key: 'context', Name: 'Context', Guidance: 'What the change does and why it exists.' },
			{ Key: 'focus', Name: 'Focus', Guidance: 'What kind of problems matter most here.' },
			{ Key: 'out-of-scope', Name: 'Out of Scope', Guidance: 'What not to spend attention on.', Optional: true }
		]
	},
	{
		Key: 'freeform',
		Name: 'Freeform',
		Description: 'One open segment, no structure imposed.',
		Segments:
		[
			{ Key: 'body', Name: 'Prompt', Guidance: 'Anything goes.' }
		]
	}
];

/**
 * Resolve the effective prompt type set from the view options: a provided
 * array wins outright; null/undefined means the defaults.
 * @param {Array|null} pConfigured
 * @returns {Array}
 */
function resolvePromptTypes(pConfigured)
{
	if (Array.isArray(pConfigured) && pConfigured.length) { return pConfigured; }
	return DefaultPromptTypes;
}

/**
 * Find a type by Key within a resolved set, with a freeform-style fallback so
 * a prompt whose type was removed by the host still renders and compiles.
 * @param {Array} pTypes
 * @param {string} pTypeKey
 * @returns {object}
 */
function getPromptType(pTypes, pTypeKey)
{
	let tmpFound = (pTypes || []).find((pType) => pType.Key === pTypeKey);
	if (tmpFound) { return tmpFound; }
	return (
	{
		Key: pTypeKey || 'unknown',
		Name: (pTypeKey ? pTypeKey : 'Unknown type'),
		Description: 'This prompt type is not in the configured set; editing the raw segments.',
		Segments: [{ Key: 'body', Name: 'Prompt', Guidance: 'Anything goes.' }]
	});
}

module.exports = { DefaultPromptTypes, resolvePromptTypes, getPromptType };
