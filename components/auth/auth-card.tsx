export function AuthCard({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        {kicker}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}

/** "or" divider used between OAuth and the email form. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        or
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
