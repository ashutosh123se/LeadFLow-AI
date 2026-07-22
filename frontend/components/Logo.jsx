import Link from 'next/link';

export function LogoMark({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-9 h-9' };
  return (
    <div className={`${sizes[size]} bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-sm ${className}`}>
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" aria-hidden>
        <path d="M3 14L7 6L11 10L17 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Logo({ href = '/', size = 'md', showText = true, className = '', link = true }) {
  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <span className="text-[15px] font-semibold text-foreground tracking-tight">LeadFlow</span>
      )}
    </div>
  );
  if (link && href) return <Link href={href}>{content}</Link>;
  return content;
}
