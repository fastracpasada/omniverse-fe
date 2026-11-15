import { Info } from 'lucide-react'

export function SourceInfo({ label, href }: { label: string; href?: string }) {
  const content = <><Info size={11} aria-hidden="true" /><span role="tooltip">{label}{href && <small>Open reference ↗</small>}</span></>
  return href
    ? <a className="source-info" href={href} target="_blank" rel="noreferrer" aria-label={`Data source: ${label}`}>{content}</a>
    : <span className="source-info" tabIndex={0} aria-label={`Data source: ${label}`}>{content}</span>
}
