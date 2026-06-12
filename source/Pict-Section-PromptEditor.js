'use strict';

/**
 * pict-section-prompteditor
 *
 * A self-contained Pict section for crafting, curating, and generating AI
 * prompts as a team:
 *
 *   - prompts are markdown, organized by prompt type into segments
 *     (context / request / success criteria and friends), with fixed-preamble
 *     segments for locked team standards
 *   - word list matrices ([["Tyrannosaurus", 3], ["Diplodocus", 1]]) drive the
 *     {~WordListEntry:Dinosaurs~} template expression by weighted random
 *   - any pict template expression works inside a prompt; generation runs the
 *     assembled markdown through the real pict template engine
 *   - generate as many concrete prompts as you like, browse them rendered,
 *     download them as a zip of markdown files
 *   - state is in-memory by default; implement PromptDataProvider to map the
 *     section onto your own back end
 *
 * The default export is the view class, registered like any pict view:
 *
 *   const libPromptEditor = require('pict-section-prompteditor');
 *   pict.addView('PromptEditor', Object.assign({}, libPromptEditor.default_configuration,
 *     { DefaultDestinationAddress: '#My-Container' }), libPromptEditor);
 *   pict.views['PromptEditor'].render();
 */

const libPromptEditorView = require('./views/PictView-PromptEditor.js');
const libProvider = require('./providers/PromptProvider-Base.js');
const libTypes = require('./types/PromptEditor-DefaultTypes.js');
const libCompiler = require('./compiler/PromptCompiler.js');
const libZip = require('./zip/PromptZip.js');
const libWordListTemplate = require('./templates/Pict-Template-WordListEntry.js');

module.exports = libPromptEditorView;
module.exports.default_configuration = libPromptEditorView.default_configuration;

// The data seam: the interface a host implements + the in-memory default.
module.exports.PromptDataProvider = libProvider.PromptDataProvider;
module.exports.InMemoryPromptProvider = libProvider.InMemoryPromptProvider;
module.exports.normalizeEntries = libProvider.normalizeEntries;

// Prompt types: the built-ins and the helpers the view uses to resolve them.
module.exports.DefaultPromptTypes = libTypes.DefaultPromptTypes;
module.exports.resolvePromptTypes = libTypes.resolvePromptTypes;
module.exports.getPromptType = libTypes.getPromptType;

// The compiler and zip utilities, for hosts generating outside the view.
module.exports.PromptCompiler = libCompiler;
module.exports.PromptZip = libZip;

// The template expression class (registered automatically by the view; exposed
// for hosts that want {~WordListEntry:~} active before any section mounts).
module.exports.PictTemplateWordListEntry = libWordListTemplate;
module.exports.weightedPick = libWordListTemplate.weightedPick;
