import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const inquiries = sqliteTable('inquiries', {
  id: text('id').primaryKey(),
  reference: text('reference').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull().default(''),
  location: text('location').notNull().default(''),
  service: text('service').notNull(),
  message: text('message').notNull(),
  privacyAcceptedAt: integer('privacy_accepted_at').notNull(),
  createdAt: integer('created_at').notNull(),
  payloadHash: text('payload_hash').notNull(),
  status: text('status').notNull().default('new'),
}, table => [index('inquiries_created_at_idx').on(table.createdAt)]);

export const inquiryLimits = sqliteTable('inquiry_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  windowStart: integer('window_start').notNull(),
}, table => [index('inquiry_limits_window_idx').on(table.windowStart)]);
