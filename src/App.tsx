import {
  Boxes,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Keyboard,
  Laptop,
  Minus,
  MonitorSmartphone,
  Plus,
  Smartphone,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import initialInventory from "./data/initialInventory.json";

type Category = "Máquinas" | "Periféricos";

type InventoryItem = {
  id: string;
  name: string;
  category: Category;
  tiRoom: number;
  protheus: number;
};

type QuantityField = "tiRoom" | "protheus";

const API_URL = "/api/inventory";
const STORAGE_KEY = "it-equipment-dashboard:v1";
const highlightedPeripheralIds = [
  "mouse",
  "teclado",
  "regua-filtro",
  "headset",
  "mousepad",
  "mochila",
  "suporte-notebook",
  "suporte-vidro-monitor",
];

const initialItems = initialInventory as InventoryItem[];

const categories: Category[] = ["Máquinas", "Periféricos"];

const categoryConfig = {
  Máquinas: {
    Icon: MonitorSmartphone,
    helper: "Computadores e dispositivos principais",
    accent: "from-cyan-500 to-blue-600",
  },
  Periféricos: {
    Icon: Keyboard,
    helper: "Acessórios e itens de apoio",
    accent: "from-amber-400 to-orange-500",
  },
} satisfies Record<Category, { Icon: typeof MonitorSmartphone; helper: string; accent: string }>;

const clampQuantity = (value: number) => Math.max(0, Math.min(9999, Math.trunc(value) || 0));

const mergeStoredItems = (storedItems: InventoryItem[]) => {
  const byId = new Map(storedItems.map((item) => [item.id, item]));

  return initialItems.map((item) => {
    const storedItem = byId.get(item.id);

    return storedItem
      ? {
          ...item,
          tiRoom: clampQuantity(storedItem.tiRoom),
          protheus: clampQuantity(storedItem.protheus),
        }
      : item;
  });
};

const loadLocalItems = () => {
  if (typeof window === "undefined") {
    return initialItems;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return initialItems;
  }

  try {
    const parsed = JSON.parse(stored) as InventoryItem[];
    return mergeStoredItems(parsed);
  } catch {
    return initialItems;
  }
};

const totalBy = (items: InventoryItem[], field: QuantityField) =>
  items.reduce((total, item) => total + item[field], 0);

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const formatPercent = (value: number) => `${Math.round(value)}%`;

export const App = () => {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("API indisponível.");
        }

        return response.json() as Promise<InventoryItem[]>;
      })
      .then((apiItems) => {
        if (isMounted) {
          setItems(mergeStoredItems(apiItems));
        }
      })
      .catch(() => {
        if (isMounted) {
          setItems(loadLocalItems());
        }
      })
      .finally(() => {
        if (isMounted) {
          setHasLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    void fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    }).catch(() => undefined);
  }, [hasLoaded, items]);

  const categoryTotals = useMemo(
    () =>
      categories.reduce(
        (acc, category) => {
          const categoryItems = items.filter((item) => item.category === category);
          acc[category] = {
            tiRoom: totalBy(categoryItems, "tiRoom"),
            protheus: totalBy(categoryItems, "protheus"),
          };
          return acc;
        },
        {} as Record<Category, { tiRoom: number; protheus: number }>,
      ),
    [items],
  );

  const dashboardData = useMemo(() => {
    const notebook = items.find((item) => item.id === "notebook") ?? initialItems[0];
    const smartphones = items.find((item) => item.id === "smartphones") ?? initialItems[3];
    const peripherals = highlightedPeripheralIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is InventoryItem => Boolean(item));

    return { notebook, smartphones, peripherals };
  }, [items]);

  const updateQuantity = (id: string, field: QuantityField, value: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, [field]: clampQuantity(value) } : item,
      ),
    );
  };

  const adjustQuantity = (id: string, field: QuantityField, delta: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, [field]: clampQuantity(item[field] + delta) } : item,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.26),transparent_34%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.20),transparent_30%)]" />

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-slate-950/30 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-100">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Painel operacional interno
            </div>
            <div>
              <h1 className="max-w-5xl text-3xl font-black leading-tight text-white sm:text-4xl">
                Quantidades de equipamentos de TI
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300 sm:text-base">
                Visualize e atualize rapidamente os volumes disponíveis na Sala da TI e no Estoque
                no Protheus.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <HeaderStat label="Itens monitorados" value={items.length} />
            <HeaderStat label="Máquinas" value={categoryTotals["Máquinas"].tiRoom + categoryTotals["Máquinas"].protheus} />
            <HeaderStat label="Periféricos" value={categoryTotals["Periféricos"].tiRoom + categoryTotals["Periféricos"].protheus} />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <PrimaryDeviceCard
            item={dashboardData.notebook}
            title="Notebooks"
            description="Equipamentos portáteis"
            icon={<Laptop className="h-7 w-7" aria-hidden="true" />}
            tone="cyan"
          />
          <PrimaryDeviceCard
            item={dashboardData.smartphones}
            title="Smartphones"
            description="Aparelhos móveis"
            icon={<Smartphone className="h-7 w-7" aria-hidden="true" />}
            tone="emerald"
          />
        </section>

        <PeripheralSummaryTable items={dashboardData.peripherals} />

        <div className="relative py-2" aria-hidden="true">
          <div className="border-t-4 border-dashed border-cyan-300/80" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-cyan-300/40 bg-slate-950 px-4 py-1 text-xs font-black uppercase text-cyan-100 shadow-lg shadow-cyan-950/40">
            Área editável
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.35fr]">
          {categories.map((category, index) => {
            const categoryItems = items.filter((item) => item.category === category);
            const { Icon, helper } = categoryConfig[category];

            return (
              <section
                key={category}
                className={`space-y-4 ${
                  index > 0
                    ? "relative border-t-4 border-dashed border-cyan-300/80 pt-8 xl:border-l-4 xl:border-t-0 xl:pl-8 xl:pt-0 xl:before:absolute xl:before:-left-[3px] xl:before:top-0 xl:before:h-full xl:before:w-1 xl:before:bg-cyan-300/25"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-950 shadow-lg shadow-slate-950/20">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{category}</h2>
                      <p className="text-sm font-medium text-slate-400">{helper}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-72">
                    <MiniTotal
                      label={`${category} na Sala da TI`}
                      value={categoryTotals[category].tiRoom}
                    />
                    <MiniTotal
                      label={`${category} no Protheus`}
                      value={categoryTotals[category].protheus}
                    />
                  </div>
                </div>

                <div className={`grid gap-4 ${category === "Periféricos" ? "md:grid-cols-2" : ""}`}>
                  {categoryItems.map((item) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      onChange={updateQuantity}
                      onAdjust={adjustQuantity}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
};

type HeaderStatProps = {
  label: string;
  value: number;
};

const HeaderStat = ({ label, value }: HeaderStatProps) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2">
    <p className="text-[0.68rem] font-black uppercase text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black leading-none text-white">{formatNumber(value)}</p>
  </div>
);

type PrimaryDeviceCardProps = {
  item: InventoryItem;
  title: string;
  description: string;
  icon: ReactNode;
  tone: "cyan" | "emerald";
};

const primaryToneClass: Record<PrimaryDeviceCardProps["tone"], string> = {
  cyan: "from-cyan-500 to-blue-600 text-cyan-50",
  emerald: "from-emerald-500 to-teal-600 text-emerald-50",
};

const PrimaryDeviceCard = ({ item, title, description, icon, tone }: PrimaryDeviceCardProps) => {
  const totalAvailable = item.tiRoom + item.protheus;

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-white text-slate-950 shadow-xl shadow-slate-950/20">
      <div className={`flex items-start justify-between gap-4 bg-gradient-to-br ${primaryToneClass[tone]} p-5`}>
        <div>
          <p className="text-sm font-black uppercase opacity-80">Equipamento principal</p>
          <h2 className="mt-1 text-4xl font-black leading-none text-white">{title}</h2>
          <p className="mt-2 text-sm font-bold opacity-90">{description}</p>
        </div>
        <div className="rounded-lg bg-white/18 p-3 ring-1 ring-white/25">{icon}</div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <MainQuantity label="Sala da TI" value={item.tiRoom} icon={<Warehouse className="h-4 w-4" />} />
          <MainQuantity label="Estoque Protheus" value={item.protheus} icon={<Boxes className="h-4 w-4" />} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:min-w-36">
            <p className="text-xs font-black uppercase text-slate-500">Total disponível</p>
            <p className="mt-3 text-4xl font-black leading-none text-slate-950">
              {formatNumber(totalAvailable)}
            </p>
          </div>
        </div>
        <DistributionPieChart
          tiRoom={item.tiRoom}
          protheus={item.protheus}
          title={title}
        />
      </div>
    </article>
  );
};

type MainQuantityProps = {
  label: string;
  value: number;
  icon: ReactNode;
};

const MainQuantity = ({ label, value, icon }: MainQuantityProps) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-2 text-sm font-black uppercase text-slate-500">
      {icon}
      {label}
    </div>
    <p className="mt-3 text-6xl font-black leading-none text-slate-950">{formatNumber(value)}</p>
  </div>
);

type DistributionPieChartProps = {
  tiRoom: number;
  protheus: number;
  title: string;
};

const pieColors = {
  tiRoom: "#f97316",
  protheus: "#2563eb",
};

const describeArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
};

const polarToCartesian = (cx: number, cy: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
};

const DistributionPieChart = ({ tiRoom, protheus, title }: DistributionPieChartProps) => {
  const total = tiRoom + protheus;
  const safeTotal = total || 1;
  const tiRoomAngle = (tiRoom / safeTotal) * 360;
  const tiRoomPercent = (tiRoom / safeTotal) * 100;
  const protheusPercent = (protheus / safeTotal) * 100;
  const chartId = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 lg:min-w-[300px]">
      <p className="text-xs font-black uppercase text-slate-500">Relação visual</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-28 w-28" role="img" aria-label={`Distribuição de ${title}`}>
            <defs>
              <filter id={`${chartId}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.22" />
              </filter>
              <filter id={`${chartId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.18" />
              </filter>
              <radialGradient id={`${chartId}-inner`} cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </radialGradient>
            </defs>
            <circle cx="60" cy="60" r="55" fill="#cbd5e1" opacity="0.35" />
            <circle cx="60" cy="60" r="52" fill="#e2e8f0" filter={`url(#${chartId}-shadow)`} />
            {total > 0 && tiRoom > 0 ? (
              <path
                d={describeArc(60, 60, 52, 0, tiRoomAngle)}
                fill={pieColors.tiRoom}
                filter={`url(#${chartId}-glow)`}
              />
            ) : null}
            {total > 0 && protheus > 0 ? (
              <path
                d={describeArc(60, 60, 52, tiRoomAngle, 360)}
                fill={pieColors.protheus}
                filter={`url(#${chartId}-glow)`}
              />
            ) : null}
            <circle cx="60" cy="60" r="30" fill="#0f172a" opacity="0.08" />
            <circle cx="60" cy="60" r="27" fill={`url(#${chartId}-inner)`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[0.62rem] font-black uppercase text-slate-500">Total</span>
            <span className="text-2xl font-black text-slate-950">{formatNumber(total)}</span>
          </div>
        </div>

        <div className="min-w-[140px] flex-1 space-y-2">
          <PieLegend
            label="Sala da TI"
            value={tiRoom}
            percent={tiRoomPercent}
            color={pieColors.tiRoom}
            icon={<Warehouse className="h-4 w-4" />}
          />
          <PieLegend
            label="Protheus"
            value={protheus}
            percent={protheusPercent}
            color={pieColors.protheus}
            icon={<Boxes className="h-4 w-4" />}
          />
        </div>
      </div>
    </div>
  );
};

type PieLegendProps = {
  label: string;
  value: number;
  percent: number;
  color: string;
  icon: ReactNode;
};

const PieLegend = ({ label, value, percent, color, icon }: PieLegendProps) => (
  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
    <div className="flex min-w-0 items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="flex min-w-0 items-center gap-1 text-[0.7rem] font-black uppercase leading-tight text-slate-500">
        <span className="shrink-0">{icon}</span>
        <span className="break-words">{label}</span>
      </span>
    </div>
    <div className="mt-2 flex items-end justify-between gap-3">
      <p className="text-2xl font-black leading-none text-slate-950">{formatNumber(value)}</p>
      <span className="shrink-0 text-sm font-black text-slate-950">{formatPercent(percent)}</span>
    </div>
  </div>
);

type PeripheralSummaryTableProps = {
  items: InventoryItem[];
};

const PeripheralSummaryTable = ({ items }: PeripheralSummaryTableProps) => (
  <section className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-xl shadow-slate-950/20">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black uppercase text-slate-500">Resumo por periférico</p>
        <h2 className="mt-1 text-3xl font-black leading-tight text-slate-950">Periféricos</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Leitura rápida por item, sem webcam e suporte de monitor articulado.
        </p>
      </div>
      <div className="rounded-lg bg-amber-100 p-3 text-amber-700 ring-1 ring-amber-200">
        <Keyboard className="h-6 w-6" aria-hidden="true" />
      </div>
    </div>

    <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
      <div className="grid min-w-[620px] grid-cols-[minmax(180px,1fr)_120px_120px_100px] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-white">
        <span>Periférico</span>
        <span className="text-right">Sala da TI</span>
        <span className="text-right">Protheus</span>
        <span className="text-right">Total</span>
      </div>
      {items.map((item, index) => {
        const totalAvailable = item.tiRoom + item.protheus;

        return (
          <div
            key={item.id}
            className={`grid min-w-[620px] grid-cols-[minmax(180px,1fr)_120px_120px_100px] items-center px-4 py-3 ${
              index % 2 === 0 ? "bg-white" : "bg-slate-50"
            }`}
          >
            <span className="font-black text-slate-950">{item.name}</span>
            <TableNumber value={item.tiRoom} />
            <TableNumber value={item.protheus} />
            <span className="text-right text-lg font-black text-slate-950">
              {formatNumber(totalAvailable)}
            </span>
          </div>
        );
      })}
    </div>
  </section>
);

type TableNumberProps = {
  value: number;
};

const TableNumber = ({ value }: TableNumberProps) => (
  <span className={`text-right text-2xl font-black ${value === 0 ? "text-rose-700" : "text-slate-950"}`}>
    {formatNumber(value)}
  </span>
);

type MiniTotalProps = {
  label: string;
  value: number;
};

const MiniTotal = ({ label, value }: MiniTotalProps) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2">
    <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black text-white">{formatNumber(value)}</p>
  </div>
);

type InventoryCardProps = {
  item: InventoryItem;
  onChange: (id: string, field: QuantityField, value: number) => void;
  onAdjust: (id: string, field: QuantityField, delta: number) => void;
};

const InventoryCard = ({ item, onChange, onAdjust }: InventoryCardProps) => {
  const balance = item.tiRoom - item.protheus;
  const total = item.tiRoom + item.protheus;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 text-slate-950 shadow-xl shadow-slate-950/10">
      <div className="flex min-h-16 items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-400">{item.category}</p>
          <h3 className="mt-1 text-xl font-black leading-snug text-slate-950">{item.name}</h3>
        </div>
        <div className="rounded-md bg-slate-100 px-3 py-2 text-right">
          <p className="text-xs font-bold uppercase text-slate-500">Total</p>
          <p className="text-xl font-black text-slate-950">{formatNumber(total)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <QuantityControl
          label="Sala da TI"
          value={item.tiRoom}
          field="tiRoom"
          itemId={item.id}
          icon={<Warehouse className="h-4 w-4" aria-hidden="true" />}
          onChange={onChange}
          onAdjust={onAdjust}
        />
        <QuantityControl
          label="Protheus"
          value={item.protheus}
          field="protheus"
          itemId={item.id}
          icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
          onChange={onChange}
          onAdjust={onAdjust}
        />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
        <span className="text-sm font-bold text-slate-500">Saldo visual</span>
        <span
          className={`inline-flex items-center gap-1 text-sm font-black ${
            balance >= 0 ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {balance >= 0 ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          {formatNumber(balance)}
        </span>
      </div>
    </article>
  );
};

type QuantityControlProps = {
  label: string;
  value: number;
  field: QuantityField;
  itemId: string;
  icon: ReactNode;
  onChange: (id: string, field: QuantityField, value: number) => void;
  onAdjust: (id: string, field: QuantityField, delta: number) => void;
};

const QuantityControl = ({
  label,
  value,
  field,
  itemId,
  icon,
  onChange,
  onAdjust,
}: QuantityControlProps) => (
  <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_144px_auto]">
    <label htmlFor={`${itemId}-${field}`} className="flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 shadow-sm">
        {icon}
      </span>
      <span className="min-w-0 text-sm font-black text-slate-700">{label}</span>
    </label>

    <input
      id={`${itemId}-${field}`}
      type="number"
      min="0"
      max="9999"
      inputMode="numeric"
      value={value}
      onChange={(event) => onChange(itemId, field, Number(event.target.value))}
      className="h-12 w-28 rounded-md border border-slate-300 bg-white px-3 text-center text-2xl font-black text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 sm:w-36"
      aria-label={`${label} de ${itemId}`}
    />

    <div className="col-span-2 flex justify-end gap-2 sm:col-span-1">
      <button
        type="button"
        onClick={() => onAdjust(itemId, field, -1)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label={`Diminuir ${label}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onAdjust(itemId, field, 1)}
        className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label={`Aumentar ${label}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
);
