/** Live Excalidraw preview (pan/zoom only). Redraws from the compiled skeleton. */
import { useEffect, useState } from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { SkeletonElement } from '@inkling/core';

type ConvertInput = Parameters<typeof convertToExcalidrawElements>[0];

interface SceneData {
  elements: readonly unknown[];
  appState?: Record<string, unknown>;
}
interface ExcalidrawApi {
  updateScene: (data: SceneData) => void;
  scrollToContent: (
    target: unknown,
    opts: {
      fitToContent?: boolean;
      fitToViewport?: boolean;
      viewportZoomFactor?: number;
      animate?: boolean;
    },
  ) => void;
}

interface Props {
  skeleton: SkeletonElement[];
  dark: boolean;
  background: string;
}

export function Preview({ skeleton, dark, background }: Props): JSX.Element {
  // Held in state (not a ref) so the render effect re-fires once the Excalidraw
  // API becomes available — otherwise the very first (cold-load) scene never
  // paints, because the API is null when the first effect runs.
  const [api, setApi] = useState<ExcalidrawApi | null>(null);

  useEffect(() => {
    const a = api;
    if (!a) return;
    let elements: ReturnType<typeof convertToExcalidrawElements> = [];
    try {
      elements = convertToExcalidrawElements(skeleton as unknown as ConvertInput);
    } catch (err) {
      console.error('[inkling] failed to convert scene', err);
      elements = [];
    }
    a.updateScene({ elements, appState: { viewBackgroundColor: background } });
    if (elements.length === 0) return;
    // Two RAFs: let Excalidraw commit the scene before we measure + center it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          a.scrollToContent(elements, {
            fitToViewport: true,
            viewportZoomFactor: 0.85,
            animate: false,
          });
        } catch (err) {
          console.error('[inkling] scrollToContent failed', err);
        }
      });
    });
  }, [api, skeleton, background]);

  return (
    <div className="preview-host">
      <Excalidraw
        excalidrawAPI={(instance) => {
          setApi(instance as unknown as ExcalidrawApi);
        }}
        viewModeEnabled
        zenModeEnabled
        theme={dark ? 'dark' : 'light'}
        initialData={{ appState: { viewBackgroundColor: background, currentItemFontFamily: 1 } }}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
        }}
      />
    </div>
  );
}
