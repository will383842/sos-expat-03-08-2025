import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Shim de compatibilité : si des imports de AdminRoutesV2 subsistent
 * ailleurs dans le code, on n'explose pas. On rend juste <Outlet/>.
 * Les vraies sous-routes admin sont maintenant déclarées dans App.tsx.
 */
export default function AdminRoutesV2() {
  return <Outlet />;
}
