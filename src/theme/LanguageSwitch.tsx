import { useState } from "react";
import TranslateIcon from "@mui/icons-material/TranslateRounded";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../design-system/components/dialogs";
import { asAppLanguage, storeLanguage, supportedLanguages, type AppLanguage } from "../i18n";
import { switchedLanguageUrl } from "../lib/languagePath";
import { hasUnsavedWork } from "../views/main/unsavedWork";

/**
 * Language selector. A Select rather than a two-state toggle so adding a third
 * language is a catalog change and nothing else. Direction follows
 * automatically — `AppThemeWithLang` derives it from the language this sets.
 *
 * **The language is in the address** (CTA-136): switching keeps the choice
 * for the next unprefixed address, moves to the same page under the new
 * language's prefix (path, query and hash kept — `lib/languagePath.ts`) and
 * changes the language, which makes the router anew there (`App.tsx`) — so
 * the screen remounts. Where a screen holds unsaved work
 * (`views/main/unsavedWork.ts`) it asks first.
 */
export default function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  const currentLang = asAppLanguage(i18n.language);
  const [pending, setPending] = useState<AppLanguage | null>(null);

  const switchTo = (language: AppLanguage) => {
    setPending(null);
    storeLanguage(language);
    window.history.replaceState(
      window.history.state,
      "",
      switchedLanguageUrl(window.location, import.meta.env.BASE_URL, language),
    );
    void i18n.changeLanguage(language);
  };

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    const newLanguage = asAppLanguage(event.target.value);
    if (newLanguage === currentLang) return;
    if (hasUnsavedWork()) setPending(newLanguage);
    else switchTo(newLanguage);
  };

  return (
    <>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <Select
          value={currentLang}
          onChange={handleLanguageChange}
          displayEmpty
          aria-label={t("nav.switchLanguage")}
          title={t("nav.switchLanguage")}
          renderValue={(value) => (
            <>
              <TranslateIcon
                fontSize="small"
                sx={{ mr: 1, ml: -0.5, opacity: 0.56, verticalAlign: "middle" }}
              />
              {t(`language.${value}`)}
            </>
          )}
          sx={{
            color: "inherit",
            "& .MuiSelect-icon": { color: "inherit" },
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "text.secondary",
            },
          }}
        >
          {supportedLanguages.map((lang) => (
            <MenuItem key={lang} value={lang} dense>
              {t(`language.${lang}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending !== null) switchTo(pending);
        }}
        title={t("nav.switchLanguageConfirm.title")}
        message={t("nav.switchLanguageConfirm.message")}
        confirmLabel={t("nav.switchLanguageConfirm.confirm")}
        cancelLabel={t("nav.switchLanguageConfirm.cancel")}
        tone="destructive"
        testId="language-switch-confirm"
      />
    </>
  );
}
