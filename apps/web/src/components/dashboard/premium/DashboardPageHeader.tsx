type DashboardPageHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function DashboardPageHeader({ kicker, title, description, action }: DashboardPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-premium-muted">{kicker}</p>
        ) : null}
        <h1 className="font-display text-3xl tracking-tight text-premium-ink md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-premium-muted md:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
