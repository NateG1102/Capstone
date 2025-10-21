// src/utils/cookies.js

const COOKIE_NAME = "wishlist";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

function setCookie(name, value, maxAgeSec = ONE_YEAR_SEC) {
  // Encode the VALUE once (do not pre-encode before calling this)
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
}

function getCookie(name) {
  const target = `${name}=`;
  const pair = document.cookie
    .split(";")
    .map(s => s.trim())
    .find(s => s.startsWith(target));
  if (!pair) return "";
  const rawValue = pair.slice(target.length);
  try {
    return decodeURIComponent(rawValue); // decode once
  } catch {
    return rawValue;
  }
}

function safeParse(jsonLike) {
  // Try raw, then single-decoded, then double-decoded (backward-compat with old double-encoding)
  try { return JSON.parse(jsonLike); } catch {}
  try { return JSON.parse(decodeURIComponent(jsonLike)); } catch {}
  try { return JSON.parse(decodeURIComponent(decodeURIComponent(jsonLike))); } catch {}
  return null;
}

export function readWishlist() {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return [];
  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeWishlist(list) {
  const unique = Array.from(new Set((list || []).map(s => String(s).toUpperCase().trim())))
    .filter(Boolean)
    .sort();
  // Store plain JSON; setCookie will encode once
  setCookie(COOKIE_NAME, JSON.stringify(unique));
  return unique;
}

export function addToWishlist(symbol) {
  const sym = String(symbol || "").toUpperCase().trim();
  if (!sym) return readWishlist();
  const list = readWishlist();
  if (!list.includes(sym)) list.push(sym);
  return writeWishlist(list);
}

export function removeFromWishlist(symbol) {
  const sym = String(symbol || "").toUpperCase().trim();
  const list = readWishlist().filter(s => s !== sym);
  return writeWishlist(list);
}
