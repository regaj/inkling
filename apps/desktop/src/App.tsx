/** The Inkling application shell: state, live compile, theming, and actions. */
import { useEffect, useMemo, useState } from 'react';
import {
  compile,
  toExcalidrawSkeleton,
  formatOf,
  defaultExportSettings,
  SAMPLE_INK,
  LIGHT_PALETTE,
  DARK_PALETTE,
  type NotationName,
  type ExportFormatId,
  type ExportSettings,
} from '@inkling/core';
import { Toolbar } from './components/Toolbar.js';
import { Editor } from './components/Editor.js';
import { Preview } from './components/Preview.js';
import { HelpPanel } from './components/HelpPanel.js';
import { ExportDialog } from './components/ExportDialog.js';
import { runExport, copyToClipboard, registerBrowserExporters } from './export/index.js';
import {
  openInkDocument,
  saveInkDocument,
  saveTextArtifact,
  saveBinaryArtifact,
} from './fileio.js';
import { initWindowEffects } from './platform.js';
import * as persist from './persistence.js';

export function App(): JSX.Element {
  const [source, setSource] = useState(() => persist.loadDocument(SAMPLE_INK));
  const [notation, setNotation] = useState<NotationName>(() => persist.loadNotation('chen'));
  const [themePref, setThemePref] = useState<persist.ThemeName>(() => persist.loadTheme());
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(() =>
    persist.loadExportSettings(defaultExportSettings('light')),
  );

  const dark = themePref === 'system' ? systemDark : themePref === 'dark';

  // ── One-time init ──────────────────────────────────────────────────────────
  useEffect(() => {
    void initWindowEffects();
    registerBrowserExporters();
  }, []);

  // ── Theme wiring ───────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── Persistence ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => persist.saveDocument(source), 400);
    return () => clearTimeout(t);
  }, [source]);
  useEffect(() => persist.saveNotation(notation), [notation]);
  useEffect(() => persist.saveTheme(themePref), [themePref]);
  useEffect(() => persist.saveExportSettings(exportSettings), [exportSettings]);

  // ── Debounced compile ──────────────────────────────────────────────────────
  const [debounced, setDebounced] = useState(source);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(source), 140);
    return () => clearTimeout(t);
  }, [source]);

  const compiled = useMemo(() => {
    const palette = dark ? DARK_PALETTE : LIGHT_PALETTE;
    const result = compile(debounced, { notation, palette });
    return {
      scene: result.scene,
      skeleton: toExcalidrawSkeleton(result.scene),
      diagnostics: result.diagnostics,
      ok: result.ok,
    };
  }, [debounced, notation, dark]);

  const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
  const previewBg = dark ? '#1C1B19' : '#F7F3EA';

  // ── Actions ────────────────────────────────────────────────────────────────
  const onNew = (): void => setSource(SAMPLE_INK);
  const onOpen = async (): Promise<void> => {
    const doc = await openInkDocument();
    if (doc) setSource(doc.contents);
  };
  const onSave = async (): Promise<void> => {
    await saveInkDocument(source);
  };
  const onToggleTheme = (): void => setThemePref(dark ? 'light' : 'dark');

  const onExport = async (format: ExportFormatId): Promise<void> => {
    setExportBusy(true);
    try {
      const artifact = await runExport(format, {
        scene: compiled.scene,
        skeleton: compiled.skeleton,
        settings: exportSettings,
      });
      const ext = formatOf(format).ext;
      if (artifact.text !== undefined) {
        await saveTextArtifact(artifact.text, ext, artifact.mime, artifact.filename);
      } else if (artifact.bytes) {
        await saveBinaryArtifact(artifact.bytes, ext, artifact.mime, artifact.filename);
      }
      setExportOpen(false);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setExportBusy(false);
    }
  };

  const copy = async (kind: 'png' | 'svg'): Promise<void> => {
    try {
      await copyToClipboard(kind, {
        scene: compiled.scene,
        skeleton: compiled.skeleton,
        settings: exportSettings,
      });
    } catch (err) {
      alert(`Copy failed: ${(err as Error).message}`);
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void onSave();
      } else if (k === 'o') {
        e.preventDefault();
        void onOpen();
      } else if (k === 'e') {
        e.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [source]);

  return (
    <>
      <Toolbar
        notation={notation}
        onNotation={setNotation}
        dark={dark}
        onToggleTheme={onToggleTheme}
        onNew={onNew}
        onOpen={() => void onOpen()}
        onSave={() => void onSave()}
        onExport={() => setExportOpen(true)}
        onCopyPng={() => void copy('png')}
        onCopySvg={() => void copy('svg')}
        onToggleHelp={() => setHelpOpen((v) => !v)}
        helpOpen={helpOpen}
      />

      <main className={`content${helpOpen ? ' help-open' : ''}`}>
        <section className="panel editor">
          <span className="panel-label">ink</span>
          <Editor value={source} onChange={setSource} dark={dark} />
        </section>

        <section className="panel preview">
          <span className="panel-label">preview · {notation}</span>
          <Preview skeleton={compiled.skeleton} dark={dark} background={previewBg} />
          {errors.length > 0 && (
            <div className="preview-error" role="alert">
              <strong>
                {errors.length} error{errors.length > 1 ? 's' : ''}
              </strong>
              <ul>
                {errors.slice(0, 6).map((d, i) => (
                  <li key={i}>
                    line {d.line}: {d.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {helpOpen && <HelpPanel />}
      </main>

      {exportOpen && (
        <ExportDialog
          settings={exportSettings}
          onChange={setExportSettings}
          onExport={(f) => void onExport(f)}
          onClose={() => setExportOpen(false)}
          busy={exportBusy}
        />
      )}
    </>
  );
}
