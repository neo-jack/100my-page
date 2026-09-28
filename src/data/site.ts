// Public website entry; model gateway addresses and credentials stay on the server.
import config from '../../site.config.json';
export const PUBLIC_SITE_ORIGIN = import.meta.env?.VITE_SITE_ORIGIN || config.siteOrigin;
export const LEGACY_SITE_URL = `${PUBLIC_SITE_ORIGIN}/2D/`;
