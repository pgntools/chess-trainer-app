/**
 * **A player's federation, as a flag** (CTA-128): the 3-letter FIDE code a
 * PGN's `WhiteCountry` / `BlackCountry` tag carries ("GER", "ENG") as the
 * code of its flag — an ISO 3166 region ("de"), or a part of the United
 * Kingdom ("gb-eng"), the names the `flag-icons` package files its flags by —
 * and its name in the reader's language. Pure.
 *
 * FIDE's codes are, with few exceptions, the IOC's: they are not ISO's
 * ("GER" is Germany, "DEN" Denmark, "NED" the Netherlands), so a table is the
 * only honest reading. A tag already in ISO's two letters is taken as one; a
 * code the table does not know has no flag, and is shown as written.
 */

/** FIDE's code, and its flag's in `flag-icons` names. */
export const FIDE_FLAG_CODES: Readonly<Record<string, string>> = {
  AFG: "af", ALB: "al", ALG: "dz", AND: "ad", ANG: "ao", ANT: "ag", ARG: "ar", ARM: "am", ARU: "aw", AUS: "au",
  AUT: "at", AZE: "az", BAH: "bs", BAN: "bd", BAR: "bb", BDI: "bi", BEL: "be", BEN: "bj", BER: "bm", BHU: "bt",
  BIH: "ba", BIZ: "bz", BLR: "by", BOL: "bo", BOT: "bw", BRA: "br", BRN: "bh", BRU: "bn", BUL: "bg", BUR: "bf",
  CAF: "cf", CAM: "kh", CAN: "ca", CAY: "ky", CGO: "cg", CHA: "td", CHI: "cl", CHN: "cn", CIV: "ci", CMR: "cm",
  COD: "cd", COL: "co", COM: "km", CPV: "cv", CRC: "cr", CRO: "hr", CUB: "cu", CYP: "cy", CZE: "cz", DEN: "dk",
  DJI: "dj", DMA: "dm", DOM: "do", ECU: "ec", EGY: "eg", ENG: "gb-eng", ERI: "er", ESA: "sv", ESP: "es", EST: "ee",
  ETH: "et", FAI: "fo", FIJ: "fj", FIN: "fi", FRA: "fr", GAB: "ga", GAM: "gm", GBS: "gw", GCI: "gg", GEO: "ge",
  GEQ: "gq", GER: "de", GHA: "gh", GRE: "gr", GRN: "gd", GUA: "gt", GUI: "gn", GUM: "gu", GUY: "gy", HAI: "ht",
  HKG: "hk", HON: "hn", HUN: "hu", INA: "id", IND: "in", IOM: "im", IRI: "ir", IRL: "ie", IRQ: "iq", ISL: "is",
  ISR: "il", ISV: "vi", ITA: "it", IVB: "vg", JAM: "jm", JCI: "je", JOR: "jo", JPN: "jp", KAZ: "kz", KEN: "ke",
  KGZ: "kg", KIR: "ki", KOR: "kr", KOS: "xk", KSA: "sa", KUW: "kw", LAO: "la", LAT: "lv", LBA: "ly", LBN: "lb",
  LBR: "lr", LCA: "lc", LES: "ls", LIE: "li", LTU: "lt", LUX: "lu", MAC: "mo", MAD: "mg", MAR: "ma", MAS: "my",
  MAW: "mw", MDA: "md", MDV: "mv", MEX: "mx", MGL: "mn", MKD: "mk", MLI: "ml", MLT: "mt", MNC: "mc", MNE: "me",
  MOZ: "mz", MRI: "mu", MTN: "mr", MYA: "mm", NAM: "na", NCA: "ni", NED: "nl", NEP: "np", NGR: "ng", NIG: "ne",
  NOR: "no", NRU: "nr", NZL: "nz", OMA: "om", PAK: "pk", PAN: "pa", PAR: "py", PER: "pe", PHI: "ph", PLE: "ps",
  PLW: "pw", PNG: "pg", POL: "pl", POR: "pt", PUR: "pr", QAT: "qa", ROU: "ro", RSA: "za", RUS: "ru", RWA: "rw",
  SAM: "ws", SCO: "gb-sct", SEN: "sn", SEY: "sc", SGP: "sg", SKN: "kn", SLE: "sl", SLO: "si", SMR: "sm", SOL: "sb",
  SOM: "so", SRB: "rs", SRI: "lk", SSD: "ss", STP: "st", SUD: "sd", SUI: "ch", SUR: "sr", SVK: "sk", SWE: "se",
  SWZ: "sz", SYR: "sy", TAN: "tz", TGA: "to", TJK: "tj", TKM: "tm", TLS: "tl", TOG: "tg", TPE: "tw", TTO: "tt",
  TUN: "tn", TUR: "tr", UAE: "ae", UGA: "ug", UKR: "ua", URU: "uy", USA: "us", UZB: "uz", VAN: "vu", VEN: "ve",
  VIE: "vn", VIN: "vc", WLS: "gb-wls", YEM: "ye", ZAM: "zm", ZIM: "zw",
};

/** The parts of the United Kingdom, which `Intl.DisplayNames` does not name. */
const SUBDIVISION_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "gb-eng": { en: "England", he: "אנגליה" },
  "gb-sct": { en: "Scotland", he: "סקוטלנד" },
  "gb-wls": { en: "Wales", he: "ויילס" },
  "gb-nir": { en: "Northern Ireland", he: "צפון אירלנד" },
};

/** A federation's flag: its code in `flag-icons`' names, and the federation's name. */
export type FederationFlag = { code: string; name: string };

/** A federation tag's flag code — `undefined` for a code the table does not know. */
export const flagCodeOf = (federation: string): string | undefined => {
  const code = federation.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) return code.toLowerCase();
  return FIDE_FLAG_CODES[code];
};

/** A federation's name in `language` ("Germany", "גרמניה") — the code as written where it has none. */
export const federationName = (federation: string, language: string): string => {
  const code = flagCodeOf(federation);
  if (code === undefined) return federation;
  const subdivision = SUBDIVISION_NAMES[code];
  if (subdivision !== undefined) return subdivision[language] ?? subdivision.en;
  try {
    return new Intl.DisplayNames([language, "en"], { type: "region" }).of(code.toUpperCase()) ?? federation;
  } catch {
    return federation;
  }
};

/** A federation tag as a flag and its name — `undefined` for a code the table does not know. */
export const federationFlagOf = (federation: string | undefined, language: string): FederationFlag | undefined => {
  if (federation === undefined) return undefined;
  const code = flagCodeOf(federation);
  return code === undefined ? undefined : { code, name: federationName(federation, language) };
};
