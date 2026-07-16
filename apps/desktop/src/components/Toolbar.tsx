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
        <svg className="brand-drop" viewBox="0 0 24 24" aria-hidden width="20" height="20">
          <path
            d="M12 2s-7 9-7 13.5a7 7 0 1 0 14 0C19 11 12 2 12 2Z"
            fill="var(--accent)"
          />
          <ellipse cx="9.4" cy="15.2" rx="1.7" ry="2.5" fill="rgba(255,255,255,0.4)" />
        </svg>
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
