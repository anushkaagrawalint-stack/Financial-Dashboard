'use client';

interface Props {
  onClick: () => void;
  label?: string;
  busy?: boolean;
}

// Small icon button for per-table/per-chart downloads (admin-only, rendered
// by the caller). Kept tiny and unobtrusive since it sits inside card headers.
export default function DownloadButton({ onClick, label = 'Download', busy }: Props) {
  return (
    <button className="dl-btn" onClick={onClick} disabled={busy} title={label} aria-label={label}>
      {busy ? (
        <span className="dl-btn-spinner" />
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
    </button>
  );
}
