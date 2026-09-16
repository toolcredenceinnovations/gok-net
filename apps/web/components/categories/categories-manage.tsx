'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { subcategoryStatus, useCategories, useSubcategories, type SubcategoryStatus } from '@/lib/hooks/use-categories'
import { AddSubcategoryForm } from './add-subcategory-form'
import { SubcategoryRow } from './subcategory-row'

const TONES = ['amber', 'charcoal', 'sand', 'pale'] as const

type View = SubcategoryStatus | 'all'
const VIEWS: { value: View; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

export function CategoriesManage() {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const [view, setView] = useState<View>('all')
  // Fetch every status once; the view switcher below filters client-side so
  // switching views is instant and the per-category counts stay accurate.
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories(undefined, {
    includeInactive: true,
    includeArchived: true,
  })
  const [addOpen, setAddOpen] = useState(false)
  const [addCategoryId, setAddCategoryId] = useState<string | undefined>()

  const visible = useMemo(
    () => (view === 'all' ? subcategories : subcategories.filter((sub) => subcategoryStatus(sub) === view)),
    [subcategories, view]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, typeof subcategories>()
    for (const sub of visible) {
      const existing = map.get(sub.category_id)
      if (existing) existing.push(sub)
      else map.set(sub.category_id, [sub])
    }
    return map
  }, [visible])

  const counts = useMemo(() => {
    const byCategory = new Map<string, { active: number; inactive: number; archived: number }>()
    for (const sub of subcategories) {
      const entry = byCategory.get(sub.category_id) ?? { active: 0, inactive: 0, archived: 0 }
      entry[subcategoryStatus(sub)]++
      byCategory.set(sub.category_id, entry)
    }
    return byCategory
  }, [subcategories])

  function openAdd(categoryId?: string) {
    setAddCategoryId(categoryId)
    setAddOpen(true)
  }

  if (categoriesLoading) return <p className="list-loading">Loading categories…</p>

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Categories</h1>
          <p>Keep expense classification consistent across the whole team.</p>
        </div>
        <div className="heading-actions">
          <div className="category-admin-toolbar" role="tablist" aria-label="Filter by status">
            {VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={view === option.value}
                className={`view-switch-item${view === option.value ? ' is-active' : ''}`}
                onClick={() => setView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button className="primary-button" onClick={() => openAdd()}>
            <Plus size={17} /> Add subcategory
          </button>
        </div>
      </header>

      <AddSubcategoryForm
        open={addOpen}
        categories={categories}
        defaultCategoryId={addCategoryId}
        onCancel={() => setAddOpen(false)}
        onCreated={() => setAddOpen(false)}
      />

      <div className="category-admin-grid">
        {categories.map((category, index) => {
          const items = grouped.get(category.id) ?? []
          const { active = 0, inactive = 0, archived = 0 } = counts.get(category.id) ?? {}
          return (
            <article className="panel category-admin" key={category.id}>
              <header className="category-admin-header">
                <i className={TONES[index % TONES.length]} />
                <div>
                  <h2>{category.name}</h2>
                  <p>
                    {active} subcategor{active === 1 ? 'y' : 'ies'}
                    {inactive ? ` · ${inactive} inactive` : ''}
                    {archived ? ` · ${archived} archived` : ''}
                  </p>
                </div>
              </header>
              <div>
                {subcategoriesLoading ? (
                  <p className="category-admin-empty">Loading…</p>
                ) : items.length ? (
                  items.map((item) => <SubcategoryRow key={item.id} subcategory={item} />)
                ) : (
                  <p className="category-admin-empty">
                    {view === 'active' ? 'No subcategories yet.' : `No ${view} subcategories.`}
                  </p>
                )}
              </div>
              <footer>
                <button onClick={() => openAdd(category.id)}>
                  <Plus size={14} /> Add subcategory
                </button>
              </footer>
            </article>
          )
        })}
      </div>
    </div>
  )
}
