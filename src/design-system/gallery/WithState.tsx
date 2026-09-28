import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

type WithStateProps<T> = {
  /** The demo's state on mount. */
  initial: T;
  /** The demo, given the state and its setter. */
  children: (value: T, set: Dispatch<SetStateAction<T>>) => ReactNode;
};

/**
 * **A gallery demo's state** (CTA-108). A `*.gallery.tsx` default-exports
 * data, so it declares no component of its own (react-refresh's lint rule);
 * a demo that must be live — a switch that switches, a field that types —
 * keeps its state here instead:
 *
 * ```tsx
 * render: () => (
 *   <WithState initial={false}>
 *     {(checked, setChecked) => <SwitchField checked={checked} onChange={setChecked} … />}
 *   </WithState>
 * ),
 * ```
 */
function WithState<T>({ initial, children }: WithStateProps<T>) {
  const [value, setValue] = useState<T>(initial);
  return <>{children(value, setValue)}</>;
}

export default WithState;
