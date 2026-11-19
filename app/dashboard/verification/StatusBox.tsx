export function StatusBox({
  tone,
  title,
  children,
}: {
  tone: "ok" | "wait" | "bad";
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    ok: "border-teal/40 bg-teal/10",
    wait: "border-amber/50 bg-amber/10",
    bad: "border-red-300 bg-red-50",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="font-bold text-navy">{title}</p>
      {children && <div className="mt-1 text-sm text-ink/80">{children}</div>}
    </div>
  );
}