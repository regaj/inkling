/** CodeMirror 6 editor for `.ink` documents. */
import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { searchKeymap } from '@codemirror/search';
import { inkLanguage } from '../lang/ink.js';

interface Props {
  value: string;
  onChange: (value: string) => void;
  dark: boolean;
}

function baseTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': { height: '100%', backgroundColor: 'var(--editor-bg)', color: 'var(--text-hi)' },
      '.cm-content': { caretColor: 'var(--accent)' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent)',
      },
      '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--text-hi) 4%, transparent)' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--accent)' },
      '.cm-lintRange-error': { textDecorationColor: 'var(--err)' },
      '.cm-tooltip': {
        backgroundColor: 'var(--chrome-solid)',
        border: '1px solid var(--chrome-border)',
        borderRadius: '7px',
        color: 'var(--text-hi)',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-on)',
      },
    },
    { dark },
  );
}

export function Editor({ value, onChange, dark }: Props): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const themeComp = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mount once.
  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        rectangularSelection(),
        history(),
        bracketMatching(),
        closeBrackets(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...lintKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        themeComp.current.of([inkLanguage(dark), baseTheme(dark)]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
  }, []);

  // Swap language/theme when the app theme changes.
  useEffect(() => {
    view.current?.dispatch({
      effects: themeComp.current.reconfigure([inkLanguage(dark), baseTheme(dark)]),
    });
  }, [dark]);

  // Reflect external value changes (open file, load sample) without clobbering edits.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    if (v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div className="editor-host" ref={host} />;
}
