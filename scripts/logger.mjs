import { MODULE_TITLE, SETTINGS, MODULE_ID } from "./constants.mjs";

const warned = new Set();

function debugEnabled() {
  try {
    return Boolean(game?.settings?.get(MODULE_ID, SETTINGS.DEBUG_LOGGING));
  } catch {
    return false;
  }
}

export const logger = Object.freeze({
  debug(...args) {
    if (debugEnabled()) console.debug(`[${MODULE_TITLE}]`, ...args);
  },

  info(...args) {
    console.info(`[${MODULE_TITLE}]`, ...args);
  },

  warn(...args) {
    console.warn(`[${MODULE_TITLE}]`, ...args);
  },

  warnOnce(key, ...args) {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(`[${MODULE_TITLE}]`, ...args);
  },

  error(...args) {
    console.error(`[${MODULE_TITLE}]`, ...args);
  }
});
