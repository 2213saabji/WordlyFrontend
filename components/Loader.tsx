const DOTS = ["bg-correct", "bg-present", "bg-absent"];

export default function Loader({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <div className="flex gap-2">
        {DOTS.map((c, i) => (
          <span
            key={c}
            style={{ animationDelay: `${i * 120}ms` }}
            className={`h-4 w-4 animate-loader-bounce rounded-sm ${c}`}
          />
        ))}
      </div>
      <p className="animate-fade-in text-sm text-foreground/60">{label}</p>
    </div>
  );
}
