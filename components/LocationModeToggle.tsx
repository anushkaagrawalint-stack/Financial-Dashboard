'use client';

interface Props {
  isOpen: boolean;
  onChange: (open: boolean) => void;
  allLabel?: string;
  openLabel?: string;
}

export default function LocationModeToggle({ isOpen, onChange, allLabel = 'All Locations', openLabel = 'Open Locations' }: Props) {
  return (
    <div className="loc-mode-toggle">
      <button type="button" className={`loc-mode-opt${!isOpen ? ' active' : ''}`} onClick={() => onChange(false)}>
        {allLabel}
      </button>
      <button type="button" className={`loc-mode-opt${isOpen ? ' active' : ''}`} onClick={() => onChange(true)}>
        {openLabel}
      </button>
    </div>
  );
}
