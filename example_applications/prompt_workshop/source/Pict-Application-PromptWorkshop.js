'use strict';

/**
 * Prompt Workshop -- the pict-section-prompteditor example application.
 *
 * Boots a Pict app with a thin layout view (intro copy + the section's
 * container), mounts the prompt editor with its default in-memory provider,
 * and seeds the canonical data -- a Dinosaurs word list weighted 3:1 toward
 * Tyrannosaurus, a Tone list, and two prompts that template against them --
 * so crafting and generating work on first load with no server anywhere.
 */

const libPictApplication = require('pict-application');

const libPromptEditor = require('pict-section-prompteditor');

const libPictViewPromptWorkshopLayout = require('./views/PictView-PromptWorkshop-Layout.js');

const _ME = { Key: 1, Name: 'Demo Author' };

class PromptWorkshopApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.pict.addView('PromptWorkshop-Layout',
			libPictViewPromptWorkshopLayout.default_configuration, libPictViewPromptWorkshopLayout);

		this.pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
		{
			Title: 'Team Prompt Workshop',
			CurrentUser: _ME
		}), libPromptEditor);

		// The layout is the app's main viewport; its onAfterRender loads the
		// section into the container it just rendered.
		this.options.MainViewportViewIdentifier = 'PromptWorkshop-Layout';
	}

	// Seed before anything renders: provider writes only, no DOM. The layout
	// render that follows initialization pulls this data through section.load().
	onAfterInitializeAsync(fCallback)
	{
		this._seed(this.pict.views['PromptEditor'])
			.then(() => fCallback())
			.catch(() => fCallback());
	}

	// Seed through the section's provider so the example opens with something
	// to play with: two word lists and two prompts that template against them.
	_seed(pView)
	{
		let tmpProvider = pView._provider;
		return tmpProvider.createWordList(
			{
				Name: 'Dinosaurs',
				Entries: [['Tyrannosaurus', 3], ['Diplodocus', 1]]
			})
			.then(() => tmpProvider.createWordList(
				{
					Name: 'Tone',
					Entries: [['precise', 2], ['playful', 1], ['terse', 1]]
				}))
			.then(() => tmpProvider.createPrompt(
				{
					TypeKey: 'feature-request',
					Title: 'Dinosaur enclosure dashboard',
					Author: _ME,
					Segments:
					{
						'context': 'We run a small park. The {~WordListEntry:Dinosaurs~} enclosure has sensors for the fence voltage and the goat feeder, but the readings live in a terminal nobody watches.\n\nWrite in a {~WordListEntry:Tone~} voice.',
						'request': 'Build a one-page dashboard that shows fence voltage, feeder level, and the last sighting of the {~WordListEntry:Dinosaurs~}.',
						'success-criteria': '- the page loads in under a second\n- a fence drop pages the on-call keeper\n- works on the night shift tablet'
					}
				}))
			.then(() => tmpProvider.createPrompt(
				{
					TypeKey: 'freeform',
					Title: 'Daily standup haiku',
					Author: _ME,
					Segments:
					{
						'body': 'Write a standup update as a haiku about debugging the {~WordListEntry:Dinosaurs~} sensor code, in a {~WordListEntry:Tone~} register.'
					}
				}));
	}
}

module.exports = PromptWorkshopApplication;
