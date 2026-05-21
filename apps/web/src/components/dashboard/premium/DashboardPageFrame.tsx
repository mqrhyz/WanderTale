export function DashboardPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8 p-4 md:p-6 lg:p-8">{children}</div>
  );
}
