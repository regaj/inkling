/** Segmented control to switch the active ER notation. */
import type { NotationName } from '@inkling/core';

const LABELS: Record<NotationName, string> = {
  chen: 'Chen',
  crowsfoot: "Crow's Foot",
  uml: 'UML',
  idef1x: 'IDEF1X',
  minmax: 'Min-Max',
};

const ORDER: NotationName[] = ['chen', 'crowsfoot', 'uml', 'idef1x', 'minmax'];

interface Props {
  value: NotationName;
  onChange: (n: NotationName) => void;
}

export function NotationPicker({ value, onChange }: Props): JSX.Element {
  return (
    <div className="seg" role="group" aria-label="Notation">
      {ORDER.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          title={`${LABELS[n]} notation`}
        >
          {LABELS[n]}
        </button>
      ))}
    </div>
  );
}
