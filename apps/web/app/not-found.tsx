import Link from 'next/link'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return <main className="standalone-state"><div className="system-state"><span><FileQuestion size={24}/></span><p className="eyebrow">404 · Not found</p><h1>This page isn’t in the ledger</h1><p>The link may be old, or you may not have access to this record.</p><Link className="primary-button" href="/dashboard"><ArrowLeft size={16}/> Return to overview</Link></div></main>
}
