"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Library, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  EVENT_CATEGORIES,
  SECTION_COLOR,
} from "@/lib/camporee-timeline/event-categories";
import type {
  CamporeeEventsData,
  EventCategoryId,
  Section,
} from "@/lib/camporee-timeline/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: CamporeeEventsData;
  defaultDayNumber?: number;
}

const SECTIONS: Section[] = ["Aventureros", "Conquistadores", "Guías Mayores"];

export function CreateEventDrawer({ open, onOpenChange, data, defaultDayNumber = 1 }: Props) {
  const [origin, setOrigin] = React.useState<"new" | "catalog">("new");
  const [category, setCategory] = React.useState<EventCategoryId>("competencia");
  const [sections, setSections] = React.useState<Set<Section>>(new Set(["Conquistadores"]));
  const [day, setDay] = React.useState<number>(defaultDayNumber);
  const [saveAsTemplate, setSaveAsTemplate] = React.useState(true);

  React.useEffect(() => {
    setDay(defaultDayNumber);
  }, [defaultDayNumber]);

  const toggleSection = (s: Section) => {
    const n = new Set(sections);
    if (n.has(s)) n.delete(s); else n.add(s);
    setSections(n);
  };

  const scopeLabel =
    data.camporeeType === "union" ? (
      <>
        en la <b>Unión</b> ({data.unionName})
      </>
    ) : (
      <>
        en tu <b>campo local</b> ({data.localFieldName ?? "—"})
      </>
    );

  const handleSubmit = () => {
    // TODO: wire backend
    console.log("create event", { origin, category, sections: Array.from(sections), day, saveAsTemplate });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] max-w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-5 pb-3 border-b border-border/60">
          <SheetTitle className="text-[16px] font-semibold tracking-tight">Crear evento</SheetTitle>
          <SheetDescription className="text-[12px]">
            Se guardará en este camporee. Puedes marcarlo como reutilizable para futuros camporees.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
          <Tabs value={origin} onValueChange={(v) => setOrigin(v as typeof origin)}>
            <TabsList className="w-full">
              <TabsTrigger value="new" className="flex-1 gap-1.5">
                <Plus className="size-3.5" />
                Nuevo evento
              </TabsTrigger>
              <TabsTrigger value="catalog" className="flex-1 gap-1.5">
                <Library className="size-3.5" />
                Desde catálogo
              </TabsTrigger>
            </TabsList>
            <TabsContent value="catalog" className="mt-4 space-y-2">
              <Label className="text-[12px]">Plantilla disponible</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Elegir del catálogo…" /></SelectTrigger>
                <SelectContent>
                  {data.templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                      <span className="text-muted-foreground ml-1.5 text-[11px]">
                        ({t.scope === "union" ? "Unión" : "Campo"} · usado {t.uses}x)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Importar copia las propiedades base de la plantilla. Podrás ajustar día, horario, sede y cupo para este camporee.
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[12px] font-semibold">Título del evento</Label>
            <Input id="title" defaultValue="Competencia de nudos y amarres" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-[12px] font-semibold">
              Descripción <span className="text-muted-foreground font-normal">opcional</span>
            </Label>
            <Textarea
              id="desc"
              rows={3}
              defaultValue="10 nudos cronometrados + amarre cuadrado en equipos de 4."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold">Categoría</Label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_CATEGORIES.map((c) => {
                const on = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] border transition-colors",
                      on ? cn("font-semibold", c.tint, c.border) : "border-border/60 text-foreground hover:bg-muted",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", c.dot)} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Día</Label>
              <Select value={String(day)} onValueChange={(v) => setDay(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.days.map((d) => (
                    <SelectItem key={d.id} value={String(d.numero)}>
                      D{d.numero} · {d.fechaFmt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Inicio</Label>
              <Input type="time" defaultValue="09:00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Fin</Label>
              <Input type="time" defaultValue="11:30" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold">Secciones que participan</Label>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map((s) => {
                const on = sections.has(s);
                const sc = SECTION_COLOR[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSection(s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] border transition-colors",
                      on ? cn("font-semibold", sc.tint) : "border-border/60 text-foreground hover:bg-muted",
                    )}
                  >
                    <span className={cn("size-2.5 rounded-full", sc.dot, !on && "opacity-30")} />
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Define quién puede inscribirse y filtra el evento en la app de los clubes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Sede</Label>
              <Select defaultValue={data.venues[3]?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} <span className="text-muted-foreground ml-1">({v.capacity})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Responsable</Label>
              <Select defaultValue="erick">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="erick">Erick Mora</SelectItem>
                  <SelectItem value="karla">Karla Soto</SelectItem>
                  <SelectItem value="raul">Cap. Raúl Vega</SelectItem>
                  <SelectItem value="sofia">Dra. Sofía Martín</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Cupo máximo</Label>
              <Input type="number" defaultValue={200} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">
                Puntos en juego <span className="text-muted-foreground font-normal">opcional</span>
              </Label>
              <Input type="number" defaultValue={50} />
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                checked={saveAsTemplate}
                onCheckedChange={(c) => setSaveAsTemplate(Boolean(c))}
                className="mt-0.5"
              />
              <div>
                <div className="text-[13px] font-semibold text-foreground">
                  Guardar también como plantilla reutilizable
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                  Estará disponible en el catálogo {scopeLabel} para futuros camporees.
                </div>
              </div>
            </label>
          </div>
        </div>

        <SheetFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 flex sm:justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Guardar borrador</Button>
            <Button size="sm" onClick={handleSubmit}>
              <Check />
              Crear y publicar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
