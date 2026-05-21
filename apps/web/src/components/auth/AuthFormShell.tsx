type AuthFormShellProps = {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthFormShell({ kicker, title, description, children, footer }: AuthFormShellProps) {
  return (
    <article className="wt-auth-glass w-full">
      <header className="border-b border-white/15 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.088em] text-wt-primary">{kicker}</p>
        <h1 className="mt-2.5 text-[1.75rem] font-normal leading-[1.2] tracking-[-0.02em] text-white sm:text-[1.875rem]">
          {title}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-white/70">{description}</p>
      </header>

      <div className="pt-6">{children}</div>

      {footer ? (
        <footer className="mt-6 text-center text-sm text-white/75">{footer}</footer>
      ) : null}
    </article>
  );
}
