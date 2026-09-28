import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import AppThemeWithLang from './theme/AppThemeWithLang'
import { SnackbarProvider } from './design-system/components/feedback'
// Side-effect import: initialises i18next before the tree reads a language.
import './i18n'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeWithLang>
      {/*
        `enableColorScheme` sets the `color-scheme` CSS property from the active
        scheme, so the browser's own chrome — scrollbars, form controls — follows
        the toggle instead of staying light under a dark page.
      */}
      <CssBaseline enableColorScheme />
      {/*
        The app's one snackbar and its queue (CTA-108): any screen shows one
        through `useSnackbar()`. Inside the theme, so it wears the reader's.
      */}
      <SnackbarProvider>
        <App />
      </SnackbarProvider>
    </AppThemeWithLang>
  </StrictMode>,
)
