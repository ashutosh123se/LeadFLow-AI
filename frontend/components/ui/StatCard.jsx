export function StatCard({ label, value, delta, icon: Icon, iconClass = 'text-primary bg-primary-light' }) {
  return (
    <div className="stat-card">
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-number">{value}</p>
        {delta && <p className="stat-delta">{delta}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
