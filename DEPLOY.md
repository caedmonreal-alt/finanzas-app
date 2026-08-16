# Despliegue paso a paso (Iteración 1)

Tiempo estimado: 25–30 min. Necesitas: Terminal en tu Mac, las cuentas de GitHub (usuario `caedmonreal-alt`), Vercel y Supabase (org "caedmonreal-alt's Org").

## 0. Preparar la Mac (una sola vez)
1. Instala Node.js LTS desde https://nodejs.org (botón "LTS", instalador .pkg). Al terminar, abre Terminal y verifica:
   ```bash
   node -v     # debe decir v20 o v22
   npm -v
   git --version   # si pide instalar "Command Line Tools", acepta
   ```
2. Descomprime `finanzas-app.zip` en tu carpeta de proyectos, por ejemplo `~/Proyectos/finanzas-app`.

## 1. Supabase — proyecto y base de datos
1. En https://supabase.com/dashboard, dentro de tu organización, pulsa **New project**:
   - Name: `finanzas`
   - Database password: genera una y guárdala en tu llavero (no la vamos a usar en la app).
   - Region: **East US (North Virginia)** (la más cercana a México).
   - Pulsa **Create new project** y espera 1–2 minutos.
2. Menú izquierdo → **SQL Editor** → **New query**. Abre el archivo `supabase/migrations/20260815000000_init.sql` del proyecto, copia TODO su contenido, pégalo y pulsa **Run**. Debe terminar con "Success. No rows returned".
   - Esto crea las tablas (`accounts`, `categories`, `transactions`, `budgets`, `snapshots`, `goals`, `profiles`), índices, políticas RLS, las vistas del dashboard y el disparador que crea tus categorías por defecto al registrarte.
3. Menú → **Authentication → Providers → Email**: verifica que **Email** esté habilitado y **Confirm email** activado (así funciona el magic link). Guarda.
4. Menú → **Project Settings → API**. Deja esta pestaña abierta: usarás **Project URL** y **anon public** en los pasos 2 y 4.

## 2. Probar en tu Mac (opcional pero recomendado)
```bash
cd ~/Proyectos/finanzas-app
cp .env.example .env.local
open -e .env.local      # pega Project URL y anon key de Supabase, guarda y cierra
npm install
npm run dev
```
Abre http://localhost:3000 → verás la pantalla de login. Escribe tu correo → llega el enlace → entra al tablero → crea una cuenta en "Cuentas".
Nota: para que el enlace mágico funcione en local, agrega `http://localhost:3000/**` en Supabase → Authentication → URL Configuration → Redirect URLs (paso 5 lo hace para producción).

## 3. Subir el código a GitHub
1. En https://github.com/new crea un repositorio **privado** llamado `finanzas-app` (sin README, sin .gitignore).
2. En Terminal, dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Iteración 1: base Next.js + Supabase + login"
   git branch -M main
   git remote add origin https://github.com/caedmonreal-alt/finanzas-app.git
   git push -u origin main
   ```
   Si pide usuario/contraseña: usa tu usuario y un **Personal Access Token** (GitHub → Settings → Developer settings → Tokens (classic) → Generate, con permiso `repo`).

## 4. Vercel — publicar
1. https://vercel.com/new → **Import** el repositorio `finanzas-app` (si no aparece, "Adjust GitHub App Permissions" y dale acceso).
2. Framework: Next.js (se detecta solo). Antes de "Deploy", abre **Environment Variables** y agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
3. **Deploy**. En ~1 minuto tendrás una URL como `https://finanzas-app-xxxx.vercel.app`. Cópiala.

## 5. Supabase — autorizar la URL de producción
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://finanzas-app-xxxx.vercel.app`
- **Redirect URLs** → Add: `https://finanzas-app-xxxx.vercel.app/**` (y `http://localhost:3000/**` si probaste en local). Save.

## 6. Probar en producción
1. Abre la URL de Vercel en el iPhone o Mac → login → escribe tu correo → abre el enlace del correo **en el mismo dispositivo/navegador** → entras al tablero.
2. Ve a **Cuentas**, agrega tu efectivo, débito, crédito (con límite) e inversiones con su saldo actual. El patrimonio neto se calcula solo.
3. En iPhone (Safari): botón Compartir → **Agregar a inicio**. Se instala como app.

## Si algo falla
- "Invalid API key" o pantalla en blanco: revisa las dos variables en Vercel (Settings → Environment Variables) y vuelve a desplegar (Deployments → ⋯ → Redeploy).
- El enlace del correo regresa a /login?error=link: falta la URL en Redirect URLs (paso 5) o abriste el enlace en otro navegador.
- No llega el correo: revisa spam; el remitente por defecto es noreply@mail.app.supabase.io (límite de 3–4 correos/hora en plan Free; en la Iteración 3 lo dejamos con tu propio dominio si quieres).

Cuando esté publicada, mándame la URL de Vercel (sin llaves) y arranco la Iteración 2: captura rápida de gastos, transacciones y presupuestos.
