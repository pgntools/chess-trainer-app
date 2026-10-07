import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import logo from "../../assets/chessapp-logo.png";

/**
 * Where a report goes. Plain constants rather than catalog strings: an address
 * is the same in every language (only the words around it are translated).
 * The new-issue page is the repository's, `pgntools/chess-trainer-app`.
 */
const ISSUES_URL = "https://github.com/pgntools/chess-trainer-app/issues/new";
const ISSUES_LABEL = "github.com/pgntools/chess-trainer-app/issues";
const EMAIL = "info@chessapp.dev";

/** The ways to get in touch, the preferred one first; the emoji is decoration, the words carry the meaning. */
const WAYS = [
  { id: "issue", emoji: "🐛", href: ISSUES_URL, label: ISSUES_LABEL, external: true },
  { id: "email", emoji: "✉️", href: `mailto:${EMAIL}`, label: EMAIL, external: false },
] as const;

const LOGO_PX = 48;

/**
 * **Settings → Support** (`/settings/support`, CTA-155): how to reach us — the
 * logo and a title for a header, a grey line of introduction, and a numbered
 * list of emoji-led ways to get in touch: raise a GitHub issue (preferred), or
 * send an email. Nothing here is the reader's data or a preference: nothing
 * is stored.
 */
function SupportTab() {
  const { t } = useTranslation();
  return (
    <Box data-testid="support-tab" sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2.5, pt: 1, maxWidth: 560 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box component="img" src={logo} alt="" width={LOGO_PX} height={LOGO_PX} sx={{ flexShrink: 0, borderRadius: 1.5, boxShadow: 2 }} data-testid="support-tab-logo" />
        <Typography variant="h6" component="h2" data-testid="support-tab-title">
          {t("settings.support.title", { name: t("app.brandText") })}
        </Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" data-testid="support-tab-intro">
        {t("settings.support.intro")}
      </Typography>
      <Typography variant="subtitle1" component="h3" data-testid="support-tab-heading">
        {t("settings.support.heading")}
      </Typography>
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {WAYS.map(({ id, emoji, href, label, external }) => (
          <Box component="li" key={id} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }} data-testid={`support-tab-item-${id}`}>
            <Box component="span" aria-hidden sx={{ fontSize: "1.5rem", lineHeight: 1.25, flexShrink: 0 }}>
              {emoji}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" component="p">
                {t(`settings.support.items.${id}.title`)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`settings.support.items.${id}.text`)}
              </Typography>
              <Link
                href={href}
                {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                variant="body2"
                dir="ltr"
                sx={{ overflowWrap: "anywhere" }}
                data-testid={`support-tab-item-${id}-link`}
              >
                {label}
              </Link>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default SupportTab;
