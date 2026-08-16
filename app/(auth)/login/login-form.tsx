"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="h-11 w-11 rounded-2xl bg-accent-soft text-accent grid place-items-center text-xl">✉️</div>
          <h2 className="text-[17px] font-semibold">Revisa tu correo</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Te enviamos un enlace a <b className="text-foreground">{email}</b>. Ábrelo desde este mismo dispositivo para entrar.
          </p>
          <Button variant="link" className="px-0" onClick={() => setStatus("idle")}>
            Usar otro correo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={status === "sending"}>
            {status === "sending" ? "Enviando…" : "Enviarme un enlace mágico"}
          </Button>
          <p className="text-[12.5px] text-muted-foreground text-center">
            Sin contraseñas. Recibirás un enlace de un solo uso.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
