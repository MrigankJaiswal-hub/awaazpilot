export const log = {
  info: (...a: unknown[]) => console.log('[info]', ...a),
  warn: (...a: unknown[]) => console.warn('[warn]', ...a),
  error: (...a: unknown[]) => console.error('[error]', ...a),
  debug: (...a: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') console.log('[debug]', ...a);
  }
};
