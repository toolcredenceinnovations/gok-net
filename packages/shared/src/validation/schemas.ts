import { z } from 'zod'

/**
 * Validation shared by web and mobile. These mirror the CHECK constraints in
 * the database — the DB is the real guard, this is for good error messages.
 */

export const CATEGORY_NAMES = ['Admin', 'Civil', 'Marketing', 'Others'] as const
export const PAYMENT_MODES = ['cash', 'cheque', 'voucher'] as const
export const CHEQUE_STATUSES = ['issued', 'cleared', 'bounced'] as const
export const ATTACHMENT_TYPES = ['invoice', 'challan', 'other'] as const
export const ROLES = ['owner', 'admin', 'member', 'viewer'] as const

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')

/** numeric(12,2) and amount > 0 in the database. */
const money = z
  .number()
  .positive('Amount must be more than ₹0')
  .max(9_999_999_999.99, 'Amount is too large')
  .refine((n) => Number.isFinite(n), 'Enter a valid amount')

export const expenseSchema = z.object({
  date: isoDate,
  description: z.string().trim().min(1, 'Say what this was for').max(500),
  amount: money,
  category_id: uuid,
  subcategory_id: uuid.nullish(),
  vendor_id: uuid.nullish(),
  challan_no: z.string().trim().max(100).nullish(),
  due_date: isoDate.nullish(),
})
export type ExpenseInput = z.infer<typeof expenseSchema>

/**
 * Cheque fields are all-or-nothing, matching the cheque_fields_consistent and
 * cheque_has_status constraints on the payments table.
 */
export const paymentSchema = z
  .object({
    expense_id: uuid,
    amount: money,
    mode: z.enum(PAYMENT_MODES),
    paid_by: uuid,
    paid_on: isoDate,
    remark: z.string().trim().max(500).nullish(),
    cheque_no: z.string().trim().max(50).nullish(),
    cheque_bank: z.string().trim().max(100).nullish(),
    cheque_status: z.enum(CHEQUE_STATUSES).nullish(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === 'cheque') {
      if (!val.cheque_no) {
        ctx.addIssue({ code: 'custom', path: ['cheque_no'], message: 'Cheque number is required' })
      }
      if (!val.cheque_status) {
        ctx.addIssue({ code: 'custom', path: ['cheque_status'], message: 'Pick a cheque status' })
      }
    } else if (val.cheque_no || val.cheque_bank || val.cheque_status) {
      ctx.addIssue({
        code: 'custom',
        path: ['mode'],
        message: 'Cheque details only apply to cheque payments',
      })
    }
  })
export type PaymentInput = z.infer<typeof paymentSchema>

export const vendorSchema = z.object({
  name: z.string().trim().min(1, 'Vendor needs a name').max(200),
  phone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s-]{7,15}$/, 'Enter a valid phone number')
    .nullish()
    .or(z.literal('')),
  // 15 chars: 2 state + 10 PAN + 1 entity + 1 'Z' + 1 checksum
  gstin: z
    .string()
    .trim()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/, 'That does not look like a GSTIN')
    .nullish()
    .or(z.literal('')),
  notes: z.string().trim().max(1000).nullish(),
})
export type VendorInput = z.infer<typeof vendorSchema>

/** Void always needs a reason — nothing disappears silently. */
export const voidSchema = z.object({
  reason: z.string().trim().min(3, 'Say why this is being voided').max(500),
})

/** The 6-digit action PIN. */
export const pinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'The PIN is 6 digits'),
})

export const subcategorySchema = z.object({
  category_id: uuid,
  name: z.string().trim().min(1, 'Subcategory needs a name').max(100),
})
