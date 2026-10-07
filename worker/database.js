export function inquiryDatabase(env) {
  if (!env.DB) throw new Error('Inquiry database binding is unavailable');
  const db = env.DB;
  return {
    find: id => db.prepare('SELECT reference, payload_hash FROM inquiries WHERE id = ?').bind(id).first(),
    consumeQuota: (key, windowStart) => db.prepare('INSERT INTO inquiry_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < 5 RETURNING count').bind(key, windowStart).first(),
    save: (id, reference, data, hash, now) => db.batch([
      db.prepare('INSERT INTO inquiries (id, reference, name, email, phone, location, service, message, privacy_accepted_at, created_at, payload_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(id, reference, data.name, data.email, data.phone, data.location, data.service, data.message, now, now, hash, 'new'),
      db.prepare('DELETE FROM inquiry_limits WHERE window_start < ?').bind(now - 86400000),
    ]),
  };
}
