import { useWorkspaceState } from "./useWorkspaceState";
import { usePageActions } from "./usePageActions";
import { useDocumentActions } from "./useDocumentActions";
import { useMediaActions } from "./useMediaActions";
import { usePublishingActions } from "./usePublishingActions";
export function useWorkspace() {
  const state = useWorkspaceState();
  return {
    ...state,
    ...usePageActions(state),
    ...useDocumentActions(state),
    ...useMediaActions(state),
    ...usePublishingActions(state),
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
