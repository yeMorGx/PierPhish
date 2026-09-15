"use client";

import { useSyncExternalStore } from "react";
import {
  persistedPrimaryWorkspaceId,
  primaryWorkspaceId,
  readActiveWorkspaceId,
} from "@/lib/company-data";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("pierphish:workspace-selected", onStoreChange);
  return () =>
    window.removeEventListener("pierphish:workspace-selected", onStoreChange);
}

function getSnapshot() {
  return readActiveWorkspaceId();
}

function getServerSnapshot() {
  return primaryWorkspaceId;
}

export function useActiveWorkspaceId() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hasBeephishData(workspaceId: string) {
  return Boolean(workspaceId);
}

export function databaseWorkspaceId(workspaceId: string) {
  return workspaceId === primaryWorkspaceId
    ? persistedPrimaryWorkspaceId
    : workspaceId;
}
