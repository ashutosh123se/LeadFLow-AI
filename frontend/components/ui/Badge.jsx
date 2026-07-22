const styles = {
  HOT: 'badge-hot',
  WARM: 'badge-warm',
  COLD: 'badge-cold',
  COMPLETED: 'badge-success',
  active: 'badge-success',
  trial: 'badge-warm',
  suspended: 'badge-hot',
};

export function Badge({ children, variant }) {
  const cls = styles[variant] || 'badge bg-muted-surface text-muted';
  return <span className={cls}>{children}</span>;
}
