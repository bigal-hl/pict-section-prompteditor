import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';

export { EditorView, EditorState, Decoration, ViewPlugin, WidgetType, basicSetup, markdown };
export const extensions = [basicSetup, markdown()];
