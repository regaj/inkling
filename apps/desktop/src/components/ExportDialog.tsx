/** Export dialog. Carries its own theme + background, independent of the app. */
import { useState } from 'react';
import { EXPORT_FORMATS, formatOf, type ExportFormatId, type ExportSettings } from '@inkling/core';

interface Props {
  settings: ExportSettings;
  onChange: (s: ExportSettings) => void;
  onExport: (format: ExportFormatId) => void;
  onClose: () => void;
  busy: boolean;
}

const BACKGROUNDS: Array<{ label: string; value: string }> = [
  { label: 'White', value: '#FFFFFF' },
  { label: 'Warm paper', value: '#F7F3EA' },
  { label: 'Dark', value: '#1E1E1E' },
];

export function ExportDialog({ settings, onChange, onExport, onClose, busy }: Props): JSX.Element {
  const [format, setFormat] = useState<ExportFormatId>('svg');
  const raster = formatOf(format).scalable;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Export" onClick={(e) => e.stopPropagation()}>
        <h2>Export diagram</h2>

        <div className="field">
          <label htmlFor="fmt">Format</label>
          <select id="fmt" value={format} onChange={(e) => setFormat(e.target.value as ExportFormatId)}>
            {EXPORT_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} (.{f.ext})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="thm">Theme</label>
          <select
            id="thm"
            value={settings.theme}
            onChange={(e) => onChange({ ...settings, theme: e.target.value as 'light' | 'dark' })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="field">
          <label>Background</label>
          <div className="swatchrow">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                style={{ background: b.value }}
                aria-pressed={!settings.transparent && settings.background === b.value}
                title={b.label}
                onClick={() => onChange({ ...settings, background: b.value, transparent: false })}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="trans">Transparent background</label>
          <input
            id="trans"
            type="checkbox"
            checked={settings.transparent}
            onChange={(e) => onChange({ ...settings, transparent: e.target.checked })}
          />
        </div>

        {raster && (
          <div className="field">
            <label htmlFor="scale">Scale</label>
            <select
              id="scale"
              value={settings.scale}
              onChange={(e) => onChange({ ...settings, scale: Number(e.target.value) as 1 | 2 | 3 })}
            >
              <option value={1}>@1x</option>
              <option value={2}>@2x</option>
              <option value={3}>@3x</option>
            </select>
          </div>
        )}

        <div className="actions">
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => onExport(format)} disabled={busy}>
            {busy ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
