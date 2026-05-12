"use client";

import { Edit3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getClubCode,
  getClubCoordinates,
  getClubLocations,
  getTotalCapacity,
  getTotalMembers,
  pctOf,
} from "./helpers";
import type { ClubFull, SectionView } from "./types";

interface ClubInfoPanelProps {
  club: ClubFull;
  sections: SectionView[];
  onEdit?: () => void;
}

export function ClubInfoPanel({ club, sections, onEdit }: ClubInfoPanelProps) {
  const code = getClubCode(club);
  const coords = getClubCoordinates(club);
  const { localField, district, church } = getClubLocations(club);
  const members = getTotalMembers(sections);
  const capacity = getTotalCapacity(sections);
  const occupancy = pctOf(members, capacity);
  const address = club.address ?? null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Información general &amp; ubicación
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Datos editables · alcance geográfico
          </p>
        </div>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit3 className="size-3.5" /> Editar
          </Button>
        )}
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Block label="Identidad">
          <div className="text-sm font-semibold text-foreground">
            {club.name ?? "—"}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {club.description ?? "Sin descripción"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            {code}
          </div>
        </Block>

        <Block label="Ubicación pastoral">
          <div className="text-sm text-foreground">{localField ?? "—"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {district ?? "Distrito sin definir"}
          </div>
          <div className="text-xs text-muted-foreground">
            {church ?? "Iglesia sin definir"}
          </div>
        </Block>

        <Block label="Dirección">
          <div className="text-sm text-foreground">
            {address ?? "Dirección sin registrar"}
          </div>
          {coords && (
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </div>
          )}
        </Block>

        <Block label="Capacidad">
          <div className="text-lg font-extrabold tracking-tight text-foreground">
            {members}
            {capacity != null ? (
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / {capacity}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {capacity != null
              ? `${occupancy}% del cupo objetivo`
              : "Sin meta de almas definida"}
          </div>
          {capacity != null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-warning"
                style={{ width: `${occupancy}%` }}
              />
            </div>
          )}
        </Block>
      </div>

      {(coords || address) && (
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <MapPlaceholder
            label={church ?? club.name ?? "Sede"}
            address={address}
          />
          {coords && (
            <a
              className="flex items-center justify-center gap-1.5 border-t bg-muted/30 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="size-3.5" /> Ver en Google Maps
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function MapPlaceholder({
  label,
  address,
}: {
  label: string;
  address: string | null;
}) {
  return (
    <div className="relative h-44 bg-gradient-to-b from-muted to-muted/50">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="mx-auto size-4 rounded-full border-[3px] border-card bg-primary shadow-lg shadow-primary/30" />
        <div className="mx-auto h-3 w-0.5 bg-primary" />
      </div>
      <div className="absolute bottom-3 left-3 max-w-xs rounded-lg border bg-card px-2.5 py-2 text-xs shadow-md">
        <b className="block">{label}</b>
        {address && (
          <span className="block text-muted-foreground">{address}</span>
        )}
      </div>
    </div>
  );
}
