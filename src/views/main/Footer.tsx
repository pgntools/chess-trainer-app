import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';

/**
 * Project source repository. A plain constant rather than a catalog string:
 * the URL is the same in every language (only its label is translated).
 */
const REPO_URL = 'https://github.com/pgntools/chess-trainer-app';

/**
 * The app shell's footer: rendered once by `Layout`, below the sidebar + board
 * row, on every screen. It mirrors the `Header` treatment (translucent fill,
 * blur, a divider border — here on the block-start edge) and stays a dense,
 * non-scrolling strip. Direction-relative: it follows the active language like
 * the sidebar, so every inset is a logical property and it is *not* wrapped in
 * `ForceLTR` (that hatch is only for the board subtree).
 *
 * Its links, at the inline end: the legal pages (CTA-159 — the Privacy Policy and
 * the Cookies Notice, router links, so they carry the base path and the
 * language's prefix) and the project's source. Row-wrapping, so the strip
 * grows a line rather than overflow at 320 px (WCAG 1.4.10).
 */
const Footer = () => {
    const { t } = useTranslation();

    return (
        <Box
            component="footer"
            data-testid="layout-footer"
            sx={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                columnGap: 1.5,
                rowGap: 0.5,
                minHeight: 36,
                paddingInline: 2,
                paddingBlock: 0.5,
                color: 'text.secondary',
                bgcolor: 'background.translucent',
                backdropFilter: 'blur(8px)',
                borderTop: '1px solid',
                borderColor: 'divider',
                fontSize: 13,
            }}
        >
            <Typography
                component="span"
                variant="caption"
                data-testid="layout-footer-version"
                sx={{ color: 'text.secondary' }}
            >
                {t('app.brandText')} v{__APP_VERSION__}
            </Typography>

            <Box
                sx={{
                    marginInlineStart: 'auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    columnGap: 1.5,
                    rowGap: 0.5,
                }}
            >
                <Link
                    component={RouterLink}
                    to="/privacy"
                    variant="caption"
                    data-testid="layout-footer-privacy-link"
                    sx={{ color: 'text.secondary' }}
                >
                    {t('footer.privacy')}
                </Link>
                <Link
                    component={RouterLink}
                    to="/cookies"
                    variant="caption"
                    data-testid="layout-footer-cookies-link"
                    sx={{ color: 'text.secondary' }}
                >
                    {t('footer.cookies')}
                </Link>
                <Link
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener"
                    variant="caption"
                    data-testid="layout-footer-repo-link"
                    sx={{ color: 'text.secondary' }}
                >
                    {t('footer.source')}
                </Link>
            </Box>
        </Box>
    );
};

export { Footer };
