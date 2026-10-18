import { createContext, useContext } from "react";
import type { Workspace } from "./useWorkspace";
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useDesk() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("Workspace provider missing");
  return context;
}
