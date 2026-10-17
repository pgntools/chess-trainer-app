import { DEVELOPMENT_NOTICE_KEY } from "../lib/developmentNotice";

/**
 * **What a test's code put in `localStorage`** — every key but the
 * in-development notice's dismissal, which `setup.ts` writes before every test
 * (CTA-210). How a store's test says it keeps nothing there.
 */
export const localStorageKeys = (): string[] => Object.keys(localStorage).filter((key) => key !== DEVELOPMENT_NOTICE_KEY);
