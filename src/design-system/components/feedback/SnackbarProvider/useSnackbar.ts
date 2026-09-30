import { useContext } from "react";

import { SnackbarContext, type SnackbarApi } from "./snackbarContext";

/**
 * **The app's snackbar queue** (CTA-108): `const { show } = useSnackbar();
 * show({ message: t("…"), severity: "success" })`. Needs the one
 * `SnackbarProvider` the composition root mounts (`src/main.tsx`); a test
 * rendering a component that uses it wraps it in one.
 */
export function useSnackbar(): SnackbarApi {
  const api = useContext(SnackbarContext);
  if (api === null) {
    throw new Error("useSnackbar needs a <SnackbarProvider> above it — src/main.tsx mounts the app's one.");
  }
  return api;
}
