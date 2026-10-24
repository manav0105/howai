import React from 'react';

export default function SourceNotes({ metadata }) {
  if (!metadata) return null;
  return <aside className="source-notes" aria-label="Lesson sources and freshness">
    {metadata.warning && <p className="freshness-note" role="status">{metadata.warning}</p>}
    <details><summary>Sources &amp; freshness{metadata.generatedAt ? ` · ${new Date(metadata.generatedAt).toLocaleDateString()}` : ''}</summary>
      {metadata.sources?.length ? <ul>{metadata.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul> : <p>No verified search sources are available for this content.</p>}
      <p>Shared lessons refresh after 30 days. Tool features, limits and prices can change sooner.</p>
      {metadata.suggestions?.map((html, i) => <iframe key={i} title={`Google Search suggestions ${i + 1}`} srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="search-suggestions"/>)}
    </details>
  </aside>;
}
