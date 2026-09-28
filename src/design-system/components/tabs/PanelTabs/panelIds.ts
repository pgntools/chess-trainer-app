/**
 * **A tab and its panel, linked** (CTA-112): under a strip's `idPrefix`, the
 * tab is `<idPrefix>-tab-<id>` and its panel `<idPrefix>-panel-<id>`. The
 * strip gives each tab its id and the selected one its `aria-controls`; the
 * host spreads {@link tabPanelProps} on the panel it renders, so a screen
 * reader entering the panel hears which tab it belongs to.
 */
export const panelTabIds = (idPrefix: string, id: string) => ({
  tab: `${idPrefix}-tab-${id}`,
  panel: `${idPrefix}-panel-${id}`,
});

/** What makes an element a tab's panel: `role="tabpanel"`, its id, named by its tab. */
export const tabPanelProps = (idPrefix: string, id: string) => {
  const ids = panelTabIds(idPrefix, id);
  return { role: "tabpanel", id: ids.panel, "aria-labelledby": ids.tab } as const;
};
