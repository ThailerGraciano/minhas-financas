import { pgTable, serial, varchar, integer, boolean, numeric, date, uuid, timestamp, jsonb, AnyPgColumn, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  closingDay: integer('closing_day').default(1).notNull(),
  baseKeepAmount: numeric('base_keep_amount', { precision: 12, scale: 2 }).default('0').notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // checking, savings, wallet, stash, food, meal
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).default('0').notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('expense'), // income, expense
  icon: varchar('icon', { length: 50 }).notNull().default('Tag'),
  isPredictable: boolean('is_predictable').default(false).notNull(),
});

export const subcategories = pgTable('subcategories', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isPredictable: boolean('is_predictable').default(false).notNull(),
});

export const creditCards = pgTable('credit_cards', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull(),
  closingDay: integer('closing_day').notNull(),
  dueDay: integer('due_day').notNull(),
});

export const fixedTransactions = pgTable('fixed_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // income, expense, credit_card_expense
  accountId: integer('account_id').references(() => accounts.id),
  creditCardId: integer('credit_card_id').references(() => creditCards.id),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  subcategoryId: integer('subcategory_id').references(() => subcategories.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  active: boolean('active').default(true).notNull(),
  destinationAccountId: integer('destination_account_id').references(() => accounts.id),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // income, expense, transfer, credit_card_expense
  accountId: integer('account_id').references(() => accounts.id),
  creditCardId: integer('credit_card_id').references(() => creditCards.id),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  subcategoryId: integer('subcategory_id').references(() => subcategories.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  date: date('date').notNull(),
  competencyMonth: varchar('competency_month', { length: 7 }).notNull(), // YYYY-MM
  status: varchar('status', { length: 50 }).notNull(), // pending, paid, ignored
  isFixed: boolean('is_fixed').default(false).notNull(), // deprecated
  fixedTransactionId: uuid('fixed_transaction_id').references(() => fixedTransactions.id),
  installmentCurrent: integer('installment_current'),
  installmentTotal: integer('installment_total'),
  parentTransactionId: integer('parent_transaction_id').references((): AnyPgColumn => transactions.id),
  installmentParentId: integer('installment_parent_id').references((): AnyPgColumn => transactions.id),
  observations: varchar('observations', { length: 500 }),
  paidAt: timestamp('paid_at'),
  importHash: varchar('import_hash', { length: 255 }).unique(),
  invoiceMonth: varchar('invoice_month', { length: 7 }),
});

export const importLogs = pgTable('import_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  totalRows: integer('total_rows').notNull(),
  successRows: integer('success_rows').notNull(),
  errorRows: integer('error_rows').notNull(),
  errorsDetail: jsonb('errors_detail'),
  skippedRows: integer('skipped_rows').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const marketReceipts = pgTable('market_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  storeName: varchar('store_name', { length: 255 }).notNull(),
  date: timestamp('date').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
});

export const marketItems = pgTable('market_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptId: uuid('receipt_id').references(() => marketReceipts.id).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unitMeasure: varchar('unit_measure', { length: 10 }).notNull(), // KG, UN, L
  category: varchar('category', { length: 255 }),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0').notNull(),
  originalPrice: numeric('original_price', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  netPrice: numeric('net_price', { precision: 12, scale: 2 }).notNull(),
});

export const marketReceiptTransactions = pgTable('market_receipt_transactions', {
  receiptId: uuid('receipt_id').references(() => marketReceipts.id).notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),
}, (table) => [primaryKey({ columns: [table.receiptId, table.transactionId] })]);

export const allocationRules = pgTable('allocation_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const batchLogs = pgTable('batch_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  batchId: uuid('batch_id').notNull(),
  transactionId: integer('transaction_id'),
  actionType: varchar('action_type', { length: 20 }).notNull(), // 'update' | 'delete'
  beforeData: jsonb('before_data').notNull(),
  afterData: jsonb('after_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  settings: many(settings),
  allocationRules: many(allocationRules),
  accounts: many(accounts),
  categories: many(categories),
  subcategories: many(subcategories),
  creditCards: many(creditCards),
  fixedTransactions: many(fixedTransactions),
  transactions: many(transactions),
  marketReceipts: many(marketReceipts),
  batchLogs: many(batchLogs),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(users, {
    fields: [settings.userId],
    references: [users.id],
  }),
}));

export const allocationRulesRelations = relations(allocationRules, ({ one }) => ({
  user: one(users, {
    fields: [allocationRules.userId],
    references: [users.id],
  }),
}));

export const batchLogsRelations = relations(batchLogs, ({ one }) => ({
  user: one(users, {
    fields: [batchLogs.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const creditCardsRelations = relations(creditCards, ({ one }) => ({
  user: one(users, {
    fields: [creditCards.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
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
  subcategory: one(subcategories, {
    fields: [transactions.subcategoryId],
    references: [subcategories.id],
  }),
  parentTransaction: one(transactions, {
    fields: [transactions.parentTransactionId],
    references: [transactions.id],
  }),
  installmentParent: one(transactions, {
    fields: [transactions.installmentParentId],
    references: [transactions.id],
  }),
  fixedTransaction: one(fixedTransactions, {
    fields: [transactions.fixedTransactionId],
    references: [fixedTransactions.id],
  }),
}));

export const fixedTransactionsRelations = relations(fixedTransactions, ({ one, many }) => ({
  user: one(users, {
    fields: [fixedTransactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [fixedTransactions.accountId],
    references: [accounts.id],
  }),
  creditCard: one(creditCards, {
    fields: [fixedTransactions.creditCardId],
    references: [creditCards.id],
  }),
  category: one(categories, {
    fields: [fixedTransactions.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [fixedTransactions.subcategoryId],
    references: [subcategories.id],
  }),
  destinationAccount: one(accounts, {
    fields: [fixedTransactions.destinationAccountId],
    references: [accounts.id],
  }),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  subcategories: many(subcategories),
}));

export const subcategoriesRelations = relations(subcategories, ({ one }) => ({
  user: one(users, {
    fields: [subcategories.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
}));

export const marketReceiptsRelations = relations(marketReceipts, ({ one, many }) => ({
  user: one(users, {
    fields: [marketReceipts.userId],
    references: [users.id],
  }),
  items: many(marketItems),
  receiptTransactions: many(marketReceiptTransactions),
}));

export const marketItemsRelations = relations(marketItems, ({ one }) => ({
  receipt: one(marketReceipts, {
    fields: [marketItems.receiptId],
    references: [marketReceipts.id],
  }),
}));

export const marketReceiptTransactionsRelations = relations(marketReceiptTransactions, ({ one }) => ({
  receipt: one(marketReceipts, {
    fields: [marketReceiptTransactions.receiptId],
    references: [marketReceipts.id],
  }),
  transaction: one(transactions, {
    fields: [marketReceiptTransactions.transactionId],
    references: [transactions.id],
  }),
}));
