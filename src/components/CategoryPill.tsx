interface CategoryPillProps {
  name: string;
  icon: string;
  count: number;
  isActive?: boolean;
  onClick?: () => void;
}

const CategoryPill = ({ name, icon, count, isActive, onClick }: CategoryPillProps) => (
  <button
    onClick={onClick}
    className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
      isActive
        ? "dentzap-gradient border-transparent text-primary-foreground dentzap-shadow"
        : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5"
    }`}
  >
    <span className="text-base">{icon}</span>
    <span className="whitespace-nowrap">{name}</span>
    <span className={`text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
      {count}
    </span>
  </button>
);

export default CategoryPill;
