# Finanzas — app de finanzas personales

Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui, Recharts) + Supabase (Postgres, Auth, RLS) + Vercel. PWA instalable en iPhone/Mac.

- Guía de despliegue: `DEPLOY.md`
- Esquema SQL: `supabase/migrations/`
- Variables de entorno: `.env.example`

## Desarrollo
```bash
npm install
cp .env.example .env.local   # completa con los valores de Supabase
npm run dev
```

## Estructura
```
app/(auth)/login          Login por magic link
app/auth/callback         Intercambio del enlace por sesión
app/(dashboard)/          Layout con sidebar / tab bar y páginas
components/ui             Primitivas (button, card, input, label)
components/layout         Sidebar, tab bar, tema
lib/supabase              Clientes browser / server / middleware
lib/queries.ts            Consultas a las vistas del dashboard
supabase/migrations       SQL: tablas, índices, RLS, vistas, seed
```
