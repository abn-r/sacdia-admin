"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Image as ImageIcon,
  User,
  Building2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  completeStep1Action,
  completeStep2Action,
  completeStep3Action,
} from "@/lib/post-registration/actions";
import type {
  PostRegistrationStatus,
  PhotoStatusResponse,
} from "@/lib/api/post-registration";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StepConfig {
  key: keyof PostRegistrationStatus["steps"];
  number: 1 | 2 | 3;
  label: string;
  description: string;
  icon: React.ElementType;
  requires: string[];
}

interface PostRegistrationTabProps {
  userId: string;
  status: PostRegistrationStatus;
  photoStatus: PhotoStatusResponse;
  canOverride: boolean;
}

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS: StepConfig[] = [
  {
    key: "profilePicture",
    number: 1,
    label: "Foto de perfil",
    description: "El usuario debe subir una foto de perfil para completar este paso.",
    icon: ImageIcon,
    requires: ["Foto de perfil subida"],
  },
  {
    key: "personalInfo",
    number: 2,
    label: "Informacion personal",
    description:
      "Requiere genero, fecha de nacimiento, bautismo, al menos un contacto de emergencia y representante legal si es menor de 18.",
    icon: User,
    requires: [
      "Genero",
      "Fecha de nacimiento",
      "Bautismo (si/no)",
      "Al menos 1 contacto de emergencia",
      "Representante legal (si es menor de 18)",
    ],
  },
  {
    key: "clubSelection",
    number: 3,
    label: "Seleccion de club",
    description:
      "Asigna pais, union, campo local y membresía de club al usuario. Esta accion requiere datos adicionales y no puede forzarse desde aqui.",
    icon: Building2,
    requires: [
      "Seleccion de club y seccion",
      "Seleccion de clase",
      "Pais, union y campo local",
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Step status icon ─────────────────────────────────────────────────────────

function StepStatusIcon({
  completed,
  isNext,
}: {
  completed: boolean;
  isNext: boolean;
}) {
  if (completed) {
    return (
      <span
        aria-label="Completado"
        className="flex size-8 items-center justify-center rounded-full bg-success/10"
      >
        <CheckCircle2 className="size-5 text-success" />
      </span>
    );
  }
  if (isNext) {
    return (
      <span
        aria-label="Pendiente"
        className="flex size-8 items-center justify-center rounded-full bg-warning/10"
      >
        <Clock className="size-5 text-warning-foreground" />
      </span>
    );
  }
  return (
    <span
      aria-label="No iniciado"
      className="flex size-8 items-center justify-center rounded-full bg-muted"
    >
      <Circle className="size-5 text-muted-foreground" />
    </span>
  );
}

// ─── Step connector ───────────────────────────────────────────────────────────

function StepConnector({
  completed,
  orientation = "horizontal",
}: {
  completed: boolean;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "ml-4 w-px self-stretch",
          completed ? "bg-success/40" : "bg-border",
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "mx-4 h-px flex-1",
        completed ? "bg-success/40" : "bg-border",
      )}
    />
  );
}

// ─── Override button + confirmation dialog ────────────────────────────────────

interface OverrideButtonProps {
  stepNumber: 1 | 2 | 3;
  stepLabel: string;
  userId: string;
  disabled?: boolean;
}

function OverrideButton({
  stepNumber,
  stepLabel,
  userId,
  disabled,
}: OverrideButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const action =
        stepNumber === 1
          ? completeStep1Action
          : stepNumber === 2
            ? completeStep2Action
            : completeStep3Action;

      const result = await action(userId);

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || isPending}
        onClick={() => setOpen(true)}
        className="mt-3"
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <ShieldAlert className="mr-2 size-4" />
        )}
        Forzar completado
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar accion administrativa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vas a marcar como completado el <strong>Paso {stepNumber}: {stepLabel}</strong> de forma manual, sin que el usuario haya cumplido todos los requisitos desde la app.
              <br />
              <br />
              Esta accion queda registrada bajo tu sesion de administrador. Asegurate de que el usuario realmente cumple las condiciones del paso antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PostRegistrationTab({
  userId,
  status,
  photoStatus,
  canOverride,
}: PostRegistrationTabProps) {
  const nextStep = status.nextStep;

  return (
    <div className="space-y-6">
      {/* Overall status banner */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Estado del post-registro</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 pt-0 pb-4">
          <p className="text-sm text-muted-foreground">
            {status.complete
              ? `Completado el ${formatDate(status.dateCompleted)}`
              : "Proceso de onboarding en curso"}
          </p>
          <Badge variant={status.complete ? "success" : "warning"}>
            {status.complete ? "Completo" : "Pendiente"}
          </Badge>
        </CardContent>
      </Card>

      {/* Step progress — horizontal timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pasos del proceso</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeline header row — vertical on mobile, horizontal on desktop */}
          {/* Mobile: vertical stack */}
          <div className="flex flex-col gap-0 sm:hidden">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <StepStatusIcon
                    completed={status.steps[step.key]}
                    isNext={nextStep === step.key}
                  />
                  <span className="text-xs font-medium leading-tight">
                    Paso {step.number} — {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <StepConnector
                    completed={status.steps[step.key]}
                    orientation="vertical"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden sm:flex sm:items-center">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <StepStatusIcon
                    completed={status.steps[step.key]}
                    isNext={nextStep === step.key}
                  />
                  <span className="text-xs font-medium text-center leading-tight max-w-[80px]">
                    Paso {step.number}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <StepConnector completed={status.steps[step.key]} />
                )}
              </div>
            ))}
          </div>

          {/* Step detail cards */}
          <div className="mt-6 space-y-4">
            {STEPS.map((step) => {
              const completed = status.steps[step.key];
              const isNext = nextStep === step.key;
              const StepIcon = step.icon;

              // Step 3 cannot be force-completed from admin (requires DTO data)
              const isOverridable = step.number !== 3;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    completed
                      ? "border-success/20 bg-success/5"
                      : isNext
                        ? "border-warning/20 bg-warning/5"
                        : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                        completed
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <StepIcon size={15} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{step.label}</span>
                        <Badge
                          variant={
                            completed
                              ? "success"
                              : isNext
                                ? "warning"
                                : "outline"
                          }
                        >
                          {completed
                            ? "Completado"
                            : isNext
                              ? "Pendiente"
                              : "No iniciado"}
                        </Badge>
                      </div>

                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {step.description}
                      </p>

                      {/* Requirements list */}
                      <ul className="mt-2 space-y-0.5">
                        {step.requires.map((req) => (
                          <li
                            key={req}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <CheckCircle2
                              size={11}
                              className={
                                completed ? "text-success" : "text-muted-foreground/40"
                              }
                            />
                            {req}
                          </li>
                        ))}
                      </ul>

                      {/* Override action — only shown when step is NOT completed */}
                      {!completed && canOverride && isOverridable && (
                        <OverrideButton
                          stepNumber={step.number}
                          stepLabel={step.label}
                          userId={userId}
                        />
                      )}

                      {/* Step 3 note when not completed */}
                      {!completed && step.number === 3 && (
                        <p className="mt-3 text-[11px] text-muted-foreground italic">
                          La seleccion de club requiere datos especificos (club, clase, ubicacion) que el usuario debe ingresar desde la app movil.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Photo status card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de foto de perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span
              aria-label={photoStatus.has_photo ? "Foto subida" : "Sin foto de perfil"}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                photoStatus.has_photo
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <ImageIcon size={18} />
            </span>
            <div>
              <p className="text-sm font-medium">
                {photoStatus.has_photo
                  ? "Foto subida"
                  : "Sin foto de perfil"}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {photoStatus.has_photo
                  ? "El usuario tiene una foto de perfil registrada en el sistema."
                  : "El usuario aun no ha subido una foto de perfil. El Paso 1 del post-registro requiere esta accion."}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <Badge variant={photoStatus.has_photo ? "success" : "warning"}>
                {photoStatus.has_photo ? "Tiene foto" : "Sin foto"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission notice for read-only admins */}
      {!canOverride && (
        <p className="text-center text-sm text-muted-foreground">
          Tu rol actual solo permite visualizar el estado del post-registro. Para forzar la completitud de pasos, se requiere el permiso{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            registration:complete
          </code>
          .
        </p>
      )}
    </div>
  );
}
