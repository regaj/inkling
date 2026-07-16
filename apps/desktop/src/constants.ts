/** The application name, in one place so it's trivial to rename. */
export const APP_NAME = 'Inkling';

/** Repository URL (used in the About/help footer and Excalidraw source tag). */
export const REPO_URL = 'https://github.com/regaj/inkling';

/** localStorage keys for persisted UI state. */
export const STORAGE = {
  document: 'inkling.document',
  notation: 'inkling.notation',
  theme: 'inkling.theme',
  exportSettings: 'inkling.exportSettings',
} as const;
