"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  sendDirectNotificationAction,
  broadcastNotificationAction,
  clubNotificationAction,
  type NotificationActionState,
} from "@/lib/notifications/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
      {label}
    </Button>
  );
}

function StatusBanner({ state }: { state: NotificationActionState }) {
  if (state.error) {
    return (
      <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
        {state.success}
      </div>
    );
  }
  return null;
}

const initial: NotificationActionState = {};

export function DirectNotificationForm() {
  const [state, action] = useActionState(sendDirectNotificationAction, initial);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="size-5 text-primary" />
          <CardTitle className="text-base">Envío directo</CardTitle>
        </div>
        <CardDescription>Enviar una notificación push a un usuario específico.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <StatusBanner state={state} />
          <div className="space-y-2">
            <Label htmlFor="direct_user_id">
              ID de usuario <span className="text-destructive">*</span>
            </Label>
            <Input id="direct_user_id" name="user_id" placeholder="UUID del usuario" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct_title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input id="direct_title" name="title" placeholder="Título de la notificación" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direct_body">
              Mensaje <span className="text-destructive">*</span>
            </Label>
            <Textarea id="direct_body" name="body" placeholder="Contenido del mensaje" rows={3} required />
          </div>
          <SubmitButton label="Enviar notificación" />
        </form>
      </CardContent>
    </Card>
  );
}

export function BroadcastNotificationForm() {
  const [state, action] = useActionState(broadcastNotificationAction, initial);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="size-5 text-primary" />
          <CardTitle className="text-base">Broadcast</CardTitle>
        </div>
        <CardDescription>Enviar notificación push a todos los usuarios registrados.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <StatusBanner state={state} />
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground dark:text-warning">
            Esta acción enviará la notificación a <strong>todos</strong> los usuarios con token FCM registrado.
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast_title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input id="broadcast_title" name="title" placeholder="Título del broadcast" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast_body">
              Mensaje <span className="text-destructive">*</span>
            </Label>
            <Textarea id="broadcast_body" name="body" placeholder="Contenido del mensaje" rows={3} required />
          </div>
          <SubmitButton label="Enviar broadcast" />
        </form>
      </CardContent>
    </Card>
  );
}

export function ClubNotificationForm() {
  const [state, action] = useActionState(clubNotificationAction, initial);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <CardTitle className="text-base">Por sección de club</CardTitle>
        </div>
        <CardDescription>Enviar notificación a todos los miembros de una sección de club.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <StatusBanner state={state} />
          <div className="space-y-2">
            <Label htmlFor="club_section_id">
              ID de sección <span className="text-destructive">*</span>
            </Label>
            <Input id="club_section_id" name="section_id" type="number" placeholder="ID numérico de la sección" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="club_title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input id="club_title" name="title" placeholder="Título de la notificación" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="club_body">
              Mensaje <span className="text-destructive">*</span>
            </Label>
            <Textarea id="club_body" name="body" placeholder="Contenido del mensaje" rows={3} required />
          </div>
          <SubmitButton label="Enviar a sección" />
        </form>
      </CardContent>
    </Card>
  );
}
