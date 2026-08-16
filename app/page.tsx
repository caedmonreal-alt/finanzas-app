import { redirect } from "next/navigation";

// Middleware already sends anonymous users to /login; signed-in users land on the dashboard.
export default function Home() {
  redirect("/caja");
}
