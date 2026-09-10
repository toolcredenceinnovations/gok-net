'use client'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default function ErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="product-page state-page"><div className="system-state"><span className="is-error"><AlertCircle size={23}/></span><p className="eyebrow">Something went wrong</p><h1>We couldn’t load this workspace</h1><p>Your data is safe. Check your connection and try loading the page again.</p><button className="primary-button" onClick={reset}><RotateCcw size={16}/> Try again</button></div></div>
}
