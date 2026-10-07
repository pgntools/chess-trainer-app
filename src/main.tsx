import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import AppThemeWithLang from './theme/AppThemeWithLang'
// Side-effect import: initialises i18next before the tree reads a language.
import './i18n'
import './index.css'
// The console theme's face (JetBrains Mono, OFL). Only its @font-face rules
// load here: a browser fetches the font file when text is set in it, so a
// reader on another theme downloads nothing.
import '@fontsource-variable/jetbrains-mono'
import App from './App.tsx'

/*
  A page the build rendered ahead of time (CTA-136, `src/entry-server.tsx`)
  arrives drawn, its title and description in its head. The app **replaces**
  it: `createRoot` draws the page anew over the markup, and the shell renders
  the title and description again (`views/main/Layout.tsx`), which React adds
  rather than adopts — so the static two go first. Its other tags (the
  canonical, the previews') are for those who read only the HTML, and stay.
*/
for (const element of document.head.querySelectorAll('title, meta[name="description"]')) element.remove()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeWithLang>
      {/*
        `enableColorScheme` sets the `color-scheme` CSS property from the active
        scheme, so the browser's own chrome — scrollbars, form controls — follows
        the toggle instead of staying light under a dark page.
      */}
      <CssBaseline enableColorScheme />
      {/* The app's one snackbar queue is `AppThemeWithLang`'s (CTA-113). */}
      <App />
    </AppThemeWithLang>
  </StrictMode>,
)
