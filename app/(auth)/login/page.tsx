import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-accent text-white grid place-items-center text-lg font-bold">$</div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Finanzas</h1>
            <p className="text-[13px] text-muted-foreground">Tu dinero, claro y a la mano.</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
