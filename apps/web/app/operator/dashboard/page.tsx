import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Phase 3.5 builds the three real tabs (data quality, usage health,
 * integrity). This stub proves the operator gate and the service-role client
 * work. Keep it functional — this is for 7am, not a product screen.
 */
export default async function OperatorDashboard() {
  const admin = createAdminClient()

  const [{ count: sites }, { count: expenses }, { count: users }] = await Promise.all([
    admin.from('sites').select('*', { count: 'exact', head: true }),
    admin.from('expenses').select('*', { count: 'exact', head: true }),
    admin.from('user_profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <main className="operator-page">
      <header><span><i>G</i><strong>SiteKhata Operator</strong></span><em>Internal · restricted</em></header>
      <div className="operator-workspace"><div className="operator-heading"><p>Friday, 21 August</p><h1>System health</h1><span>Operational overview across all managed sites.</span></div><section className="operator-stats">{[['Sites', sites ?? 0, 'All operational'],['Expenses', expenses ?? 0, 'Across all time'],['Users', users ?? 0, '4 active today'],['Open flags', 7, '3 need attention']].map(([label,value,detail]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section><section className="operator-grid"><article><h2>Data quality flags</h2><p>Records that may need an operator review.</p>{[['Paid expense missing invoice','3 records','medium'],['Others category older than 14 days','2 records','low'],['Possible duplicate vendor amount','1 record','high']].map(([title,count,level]) => <div className="operator-flag" key={title}><i className={level}/><span><strong>{title}</strong><small>{count}</small></span><button>Inspect</button></div>)}</article><article><h2>Usage health</h2><p>Recent team activity and adoption.</p><div className="operator-chart"><i style={{height:'38%'}}/><i style={{height:'52%'}}/><i style={{height:'46%'}}/><i style={{height:'70%'}}/><i style={{height:'63%'}}/><i style={{height:'86%'}}/><i style={{height:'76%'}}/></div><div className="operator-legend"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></article></section></div>
    </main>
  )
}
