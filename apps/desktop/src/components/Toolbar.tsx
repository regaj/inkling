/** Top chrome: brand, notation picker, file + export actions, theme toggle. */
import type { NotationName } from '@inkling/core';
import { APP_NAME } from '../constants.js';
import { NotationPicker } from './NotationPicker.js';

interface Props {
  notation: NotationName;
  onNotation: (n: NotationName) => void;
  dark: boolean;
  onToggleTheme: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExport: () => void;
  onCopyPng: () => void;
  onCopySvg: () => void;
  onToggleHelp: () => void;
  helpOpen: boolean;
}

export function Toolbar(props: Props): JSX.Element {
  return (
    <header className="toolbar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region>
        <span className="drop" aria-hidden />
        {APP_NAME}
      </div>

      <NotationPicker value={props.notation} onChange={props.onNotation} />

      <div className="spacer" data-tauri-drag-region />

      <div className="group">
        <button className="btn" onClick={props.onNew} title="New (sample)">
          New
        </button>
        <button className="btn" onClick={props.onOpen} title="Open .ink (⌘/Ctrl+O)">
          Open
        </button>
        <button className="btn" onClick={props.onSave} title="Save .ink (⌘/Ctrl+S)">
          Save
        </button>
      </div>

      <div className="group">
        <button className="btn primary" onClick={props.onExport} title="Export… (⌘/Ctrl+E)">
          Export
        </button>
        <button className="btn" onClick={props.onCopyPng} title="Copy PNG to clipboard">
          Copy PNG
        </button>
        <button className="btn" onClick={props.onCopySvg} title="Copy SVG to clipboard">
          Copy SVG
        </button>
      </div>

      <div className="group">
        <button
          className="btn"
          onClick={props.onToggleTheme}
          title="Toggle light / dark"
          aria-label="Toggle theme"
        >
          {props.dark ? '☾' : '☀'}
        </button>
        <button
          className="btn"
          onClick={props.onToggleHelp}
          aria-pressed={props.helpOpen}
          title="Syntax help"
          aria-label="Toggle help"
        >
          ?
        </button>
      </div>
    </header>
  );
}
