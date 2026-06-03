import { pgTable, serial, varchar, integer, boolean, numeric, date, AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  closingDay: integer('closing_day').default(25).notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // checking, savings, wallet
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).default('0').notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const subcategories = pgTable('subcategories', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
});

export const creditCards = pgTable('credit_cards', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull(),
  closingDay: integer('closing_day').notNull(),
  dueDay: integer('due_day').notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // income, expense, transfer, credit_card_expense
  accountId: integer('account_id').references(() => accounts.id),
  creditCardId: integer('credit_card_id').references(() => creditCards.id),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  date: date('date').notNull(),
  competencyMonth: varchar('competency_month', { length: 7 }).notNull(), // YYYY-MM
  status: varchar('status', { length: 50 }).notNull(), // pending, paid
  isFixed: boolean('is_fixed').default(false).notNull(),
  installmentCurrent: integer('installment_current'),
  installmentTotal: integer('installment_total'),
  parentTransactionId: integer('parent_transaction_id').references((): AnyPgColumn => transactions.id),
});

// Relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  creditCard: one(creditCards, {
    fields: [transactions.creditCardId],
    references: [creditCards.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  parentTransaction: one(transactions, {
    fields: [transactions.parentTransactionId],
    references: [transactions.id],
  }),
}));

export const subcategoriesRelations = relations(subcategories, ({ one }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
}));
