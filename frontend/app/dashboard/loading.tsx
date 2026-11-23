import { DashboardLoading } from "@/components/dashboard/dashboard-loading";

// Estado de carga compartido: lo heredan Inicio y las pantallas sin uno propio,
// así que no nombra ninguna pantalla en particular.
export default function Loading() {
  return <DashboardLoading />;
}
