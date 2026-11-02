import { deflate, inflate } from 'pako';

/**
 * ROZ: share a build as a text code (no account, no server).
 * Code = "ROZ1." + base64url(deflate(JSON of the build)).
 */
const PREFIX = 'ROZ1.';

const toB64Url = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (str: string) => {
  const b = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
};

/** drop empty values so the code stays short */
const compact = (obj: any) => {
  const out: any = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
};

export const encodeBuild = (model: any) => PREFIX + toB64Url(deflate(new TextEncoder().encode(JSON.stringify(compact(model)))));

export const decodeBuild = (code: string): any => {
  const c = String(code || '').trim().replace(/\s+/g, '');
  if (!c.startsWith(PREFIX)) throw new Error('This is not a ROZ build code (it should start with ROZ1.)');
  const json = new TextDecoder().decode(inflate(fromB64Url(c.slice(PREFIX.length))));
  const model = JSON.parse(json);
  if (!model || typeof model !== 'object' || !model.class) throw new Error('The build code is damaged.');
  return model;
};
