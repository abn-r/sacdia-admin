"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 19.4326, lng: -99.1332 }; // CDMX
const DEFAULT_ZOOM = 12;
const PINNED_ZOOM = 16;

type LocationPickerProps = {
  apiKey: string;
  latFieldName?: string;
  lngFieldName?: string;
  addressFieldName?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string | null;
  mapId?: string;
};

function PlaceAutocomplete({
  onPlaceSelect,
  placeholder,
}: {
  onPlaceSelect: (place: { lat: number; lng: number; address: string }) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary("places");
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const instance = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address", "name"],
    });
    setAutocomplete(instance);
  }, [places]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      onPlaceSelect({
        lat: loc.lat(),
        lng: loc.lng(),
        address: place.formatted_address ?? place.name ?? "",
      });
    });
    return () => listener.remove();
  }, [autocomplete, onPlaceSelect]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="pl-9"
        autoComplete="off"
      />
    </div>
  );
}

function MapController({
  position,
  zoom,
}: {
  position: LatLng | null;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !position) return;
    map.panTo(position);
    map.setZoom(zoom);
  }, [map, position, zoom]);
  return null;
}

export function LocationPicker({
  apiKey,
  latFieldName = "coordinates_lat",
  lngFieldName = "coordinates_lng",
  addressFieldName,
  initialLat,
  initialLng,
  initialAddress,
  mapId = "club-location-picker",
}: LocationPickerProps) {
  const t = useTranslations("clubs.locationPicker");
  const hasInitial =
    typeof initialLat === "number" &&
    typeof initialLng === "number" &&
    Number.isFinite(initialLat) &&
    Number.isFinite(initialLng);

  const [position, setPosition] = useState<LatLng | null>(
    hasInitial ? { lat: initialLat!, lng: initialLng! } : null,
  );
  const [address, setAddress] = useState<string>(initialAddress ?? "");
  const [center, setCenter] = useState<LatLng>(
    hasInitial ? { lat: initialLat!, lng: initialLng! } : DEFAULT_CENTER,
  );
  const [zoom, setZoom] = useState<number>(hasInitial ? PINNED_ZOOM : DEFAULT_ZOOM);

  const handlePlaceSelect = useCallback(
    (place: { lat: number; lng: number; address: string }) => {
      const next = { lat: place.lat, lng: place.lng };
      setPosition(next);
      setCenter(next);
      setZoom(PINNED_ZOOM);
      if (place.address) setAddress(place.address);
    },
    [],
  );

  const handleMarkerDrag = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      setPosition({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    },
    [],
  );

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!event.detail.latLng) return;
    setPosition({
      lat: event.detail.latLng.lat,
      lng: event.detail.latLng.lng,
    });
  }, []);

  function clear() {
    setPosition(null);
    setAddress("");
  }

  if (!apiKey) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("missingApiKey")}
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="location-search">{t("searchLabel")}</Label>
          <PlaceAutocomplete
            placeholder={t("searchPlaceholder")}
            onPlaceSelect={handlePlaceSelect}
          />
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>

        <div className="h-[320px] w-full overflow-hidden rounded-md border border-border">
          <Map
            mapId={mapId}
            defaultCenter={center}
            defaultZoom={zoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={handleMapClick}
          >
            <MapController position={position} zoom={zoom} />
            {position && (
              <AdvancedMarker
                position={position}
                draggable
                onDragEnd={handleMarkerDrag}
              />
            )}
          </Map>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {position ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" />
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </span>
          ) : (
            <span>{t("noPin")}</span>
          )}
          {position && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={clear}
              className="text-xs"
            >
              <X className="size-3" />
              {t("clear")}
            </Button>
          )}
        </div>

        {/* Hidden inputs sync to host form */}
        <input
          type="hidden"
          name={latFieldName}
          value={position?.lat.toString() ?? ""}
        />
        <input
          type="hidden"
          name={lngFieldName}
          value={position?.lng.toString() ?? ""}
        />
        {addressFieldName && (
          <input type="hidden" name={addressFieldName} value={address} />
        )}
      </div>
    </APIProvider>
  );
}
