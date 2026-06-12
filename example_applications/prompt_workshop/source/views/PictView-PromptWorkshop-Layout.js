'use strict';

const libPictView = require('pict-view');

/**
 * The example's layout: intro copy and the prompt editor's container, rendered
 * into the application container the HTML shell provides. After each render it
 * loads the section into the freshly-created container (the first time) or
 * repaints it (after that), so the ordering is always container-then-section.
 */
class PictViewPromptWorkshopLayout extends libPictView
{
	onBeforeRender(pRenderable)
	{
		// The intro shows a literal template expression. Raw braces in template
		// text collide with the scanner ({~ patterns, {< inline literals), so
		// the literal rides in AppData and {~D:~} substitutes it -- substituted
		// values are never re-scanned.
		this.pict.AppData.PromptWorkshopCopy = { WLEExample: '{~WordListEntry:Dinosaurs~}' };
		return super.onBeforeRender(pRenderable);
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();

		let tmpEditor = this.pict.views['PromptEditor'];
		if (tmpEditor)
		{
			if (this._editorLoaded)
			{
				tmpEditor.render();
			}
			else
			{
				this._editorLoaded = true;
				tmpEditor.load();
			}
		}

		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = PictViewPromptWorkshopLayout;

module.exports.default_configuration =
{
	ViewIdentifier: 'PromptWorkshop-Layout',
	DefaultRenderable: 'PromptWorkshop-Layout',
	DefaultDestinationAddress: '#PromptWorkshop-Application-Container',
	AutoRender: false,
	Templates:
	[
		{
			Hash: 'PromptWorkshop-Layout',
			Template: /*html*/`
<div class="pw-wrap">
	<p class="pw-sub">An in-memory workshop. Craft prompts by type, curate weighted word lists, drop <code>{~D:AppData.PromptWorkshopCopy.WLEExample~}</code> into a segment, preview a roll inline, generate as many as you like, and download the batch as a zip of markdown files. Nothing is sent anywhere.</p>
	<div class="pw-card">
		<div id="PromptEditor-Container"></div>
	</div>
	<p class="pw-foot">Seeded with a Dinosaurs list weighted 3:1 (75% Tyrannosaurus, 25% Diplodocus). "Open in editor" hosts the full pict-section-markdowneditor via CodeMirror.</p>
</div>`
		}
	],
	Renderables:
	[
		{
			RenderableHash: 'PromptWorkshop-Layout',
			TemplateHash: 'PromptWorkshop-Layout',
			ContentDestinationAddress: '#PromptWorkshop-Application-Container',
			RenderMethod: 'replace'
		}
	]
};
