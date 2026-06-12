'use strict';

/**
 * Zip packaging for generated prompts: a folder of markdown files in a single
 * download. jszip does the byte work; this wraps the two seams the section
 * needs (build a zip from named files, hand a blob to the browser as a
 * download) and stays usable from node tests via the nodebuffer type.
 */

function _getJSZip()
{
	if (typeof window !== 'undefined' && window.JSZip) { return window.JSZip; }
	try { return require('jszip'); }
	catch (pError) { return null; }
}

/**
 * Build a zip from [{ Name, Content }] entries. Duplicate names get a numeric
 * suffix so every entry survives.
 * @param {Array<{Name: string, Content: string}>} pFiles
 * @param {object} [pOptions] - { Type: 'blob' | 'nodebuffer' (default 'blob') }
 * @returns {Promise<Blob|Buffer>}
 */
function buildZip(pFiles, pOptions)
{
	let tmpJSZip = _getJSZip();
	if (!tmpJSZip) { return Promise.reject(new Error('jszip is not available')); }
	let tmpType = (pOptions && pOptions.Type) || 'blob';
	let tmpZip = new tmpJSZip();
	let tmpSeen = {};
	(pFiles || []).forEach((pFile) =>
	{
		let tmpName = String(pFile.Name || 'file.md');
		if (tmpSeen[tmpName])
		{
			let tmpDot = tmpName.lastIndexOf('.');
			let tmpBase = (tmpDot > 0) ? tmpName.slice(0, tmpDot) : tmpName;
			let tmpExt = (tmpDot > 0) ? tmpName.slice(tmpDot) : '';
			tmpName = tmpBase + '-' + (tmpSeen[pFile.Name] + 1) + tmpExt;
		}
		tmpSeen[pFile.Name] = (tmpSeen[pFile.Name] || 0) + 1;
		tmpZip.file(tmpName, String(pFile.Content || ''));
	});
	return tmpZip.generateAsync({ type: tmpType });
}

/**
 * Hand a blob to the browser as a named download.
 * @param {Blob} pBlob
 * @param {string} pFileName
 */
function downloadBlob(pBlob, pFileName)
{
	if (typeof document === 'undefined') { return; }
	let tmpURL = URL.createObjectURL(pBlob);
	let tmpAnchor = document.createElement('a');
	tmpAnchor.href = tmpURL;
	tmpAnchor.download = pFileName || 'prompts.zip';
	document.body.appendChild(tmpAnchor);
	tmpAnchor.click();
	document.body.removeChild(tmpAnchor);
	setTimeout(() => URL.revokeObjectURL(tmpURL), 1000);
}

module.exports = { buildZip, downloadBlob };
