import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";
import { fetchModels, getProviderColor, type ModelPrice } from "@/lib/pricing";

interface ModelDropdownProps {
  value: string;
  onChange: (model: ModelPrice) => void;
  className?: string;
}

export function ModelDropdown({ value, onChange, className = "" }: ModelDropdownProps) {
  const [models, setModels] = useState<ModelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels().then((m) => {
      setModels(m);
      setFetchedAt(new Date());
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = models.find((m) => m.id === value);

  const filtered = models.filter((m) =>
    search === "" ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.provider.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, ModelPrice[]>>((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  return (
    <div ref={ref} className={`relative ${className}`} data-testid="model-dropdown">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 border border-border rounded-lg px-3 py-2 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary hover:bg-accent/50 transition-colors"
        data-testid="model-dropdown-trigger"
      >
        <div className="flex items-center gap-2 min-w-0">
          {loading ? (
            <span className="text-muted-foreground">Loading models...</span>
          ) : selected ? (
            <>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: getProviderColor(selected.provider) }}
              />
              <span className="truncate font-medium">{selected.name}</span>
              <span className="text-muted-foreground text-xs flex-shrink-0">
                ${selected.inputPricePerMillion.toFixed(2)}/$1M in
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select a model</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-background rounded-md">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                data-testid="model-search-input"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-64">
            {Object.entries(grouped).map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: getProviderColor(provider) }}
                  />
                  {provider}
                </div>
                {providerModels.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${
                      m.id === value ? "bg-accent" : ""
                    }`}
                    data-testid={`model-option-${m.id}`}
                  >
                    <span className="font-medium truncate">{m.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                      <span>${m.inputPricePerMillion.toFixed(2)}/M in</span>
                      <span>${m.outputPricePerMillion.toFixed(2)}/M out</span>
                    </div>
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No models found</div>
            )}
          </div>
          {fetchedAt && (
            <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
              Prices updated {fetchedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
