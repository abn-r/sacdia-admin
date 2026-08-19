"use client";

import { LocationPicker } from "@/components/shared/location-picker";
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type CamporeeLocationFieldsProps = {
  resetKey: string;
  lat?: number;
  lng?: number;
  place?: string;
  label: string;
  help: string;
  onCoordinatesChange: (coords: { lat?: number; long?: number }) => void;
  onPlaceFill?: (place: string) => void;
};

export function CamporeeLocationFields({
  resetKey,
  lat,
  lng,
  place,
  label,
  help,
  onCoordinatesChange,
  onPlaceFill,
}: CamporeeLocationFieldsProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const mapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <p className="text-xs text-muted-foreground">{help}</p>
      <LocationPicker
        key={resetKey}
        apiKey={apiKey}
        mapsMapId={mapsMapId}
        latFieldName="lat"
        lngFieldName="long"
        initialLat={lat}
        initialLng={lng}
        initialAddress={place}
        onLocationChange={(value) => {
          if (!value) {
            onCoordinatesChange({ lat: undefined, long: undefined });
            return;
          }
          onCoordinatesChange({ lat: value.lat, long: value.lng });
          if (onPlaceFill && !place?.trim() && value.address.trim()) {
            onPlaceFill(value.address);
          }
        }}
      />
      <FormMessage />
    </FormItem>
  );
}
