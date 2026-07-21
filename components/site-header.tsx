import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link href="/" className="brand" aria-label="Aha home">
        <span className="brand-mark" aria-hidden="true">
          P<span>↗</span>
        </span>
        <span>
          <strong>Aha</strong>
          <small>Build Week prototype</small>
        </span>
      </Link>
      <div className="header-meta">
        <span className="status-dot" aria-hidden="true" />
        Offline demo ready
      </div>
    </header>
  );
}
