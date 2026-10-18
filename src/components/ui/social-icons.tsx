export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M14 8.5h2.5V5H14c-2.2 0-3.5 1.5-3.5 3.6V11H8v3.5h2.5V21H14v-6.5h2.4l.6-3.5H14V9.1c0-.4.2-.6.6-.6Z" strokeLinejoin="round" />
    </svg>
  );
}
