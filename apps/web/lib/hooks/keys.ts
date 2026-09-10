/**
 * Every TanStack Query key in one place, so an invalidation after a mutation
 * cannot miss a cache by guessing at the key shape.
 *
 * Keys are hierarchical: invalidating `expenses.all` clears every expense
 * list and detail, which is what you almost always want after a write.
 */

export interface ExpenseFilters {
  month?: string | null // '2026-08'
  status?: 'unpaid' | 'partial' | 'paid' | null
  categoryId?: string | null
  vendorId?: string | null
  search?: string | null
  includeVoided?: boolean
}

export const queryKeys = {
  categories: ['categories'] as const,

  subcategories: {
    all: ['subcategories'] as const,
    forCategory: (
      categoryId: string | null,
      options: { includeInactive: boolean; includeArchived: boolean }
    ) => ['subcategories', categoryId, options] as const,
  },

  vendors: {
    all: ['vendors'] as const,
    list: (search?: string) => ['vendors', 'list', search ?? ''] as const,
    detail: (id: string) => ['vendors', 'detail', id] as const,
    totals: ['vendors', 'totals'] as const,
  },

  expenses: {
    all: ['expenses'] as const,
    list: (filters: ExpenseFilters) => ['expenses', 'list', filters] as const,
    detail: (id: string) => ['expenses', 'detail', id] as const,
  },

  payments: {
    all: ['payments'] as const,
    forExpense: (expenseId: string) => ['payments', 'expense', expenseId] as const,
    recent: ['payments', 'recent'] as const,
  },

  attachments: {
    forExpense: (expenseId: string) => ['attachments', 'expense', expenseId] as const,
    forPayment: (paymentId: string) => ['attachments', 'payment', paymentId] as const,
  },

  dashboard: {
    month: (month: string) => ['dashboard', 'month', month] as const,
    trend: (months: number) => ['dashboard', 'trend', months] as const,
  },

  team: ['team'] as const,

  audit: (filters: { actorId?: string | null; action?: string | null }) =>
    ['audit', filters] as const,
} as const
