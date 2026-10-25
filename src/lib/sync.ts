import { create } from "zustand";
import { useStore, type Data } from "./store";

type SyncStatus = "connecting" | "synced" | "offline";
type SyncSnapshot = { state: Data | null; revision: number; conflict?: boolean };
const additiveFields = new Set(["stock", "currentDue", "expectedCash"]);

const useSyncStatusStore = create<{ status: SyncStatus; setStatus: (status: SyncStatus) => void }>(
  (set) => ({ status: "connecting", setStatus: (status) => set({ status }) }),
);

export const useSyncStatus = () => useSyncStatusStore((state) => state.status);

const selectData = (): Data => {
  const { products, customers, sales, shift, shiftHistory, vouchers, expenses, settings } =
    useStore.getState();
  return { products, customers, sales, shift, shiftHistory, vouchers, expenses, settings };
};

const isData = (value: unknown): value is Data => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Data>;
  return (
    Array.isArray(data.products) &&
    Array.isArray(data.customers) &&
    Array.isArray(data.sales) &&
    Array.isArray(data.expenses) &&
    Array.isArray(data.shiftHistory) &&
    Array.isArray(data.vouchers) &&
    (data.shift === null || typeof data.shift === "object") &&
    !!data.settings &&
    typeof data.settings === "object"
  );
};

const same = (left: Data, right: Data) => JSON.stringify(left) === JSON.stringify(right);

function mergeRecord(
  base: Record<string, unknown> | undefined,
  local: Record<string, unknown> | undefined,
  remote: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!local && !remote) return undefined;
  if (!base) return local && remote ? mergeValues({}, local, remote) : (local ?? remote);
  if (!local) return remote && !sameValue(base, remote) ? remote : undefined;
  if (!remote) return !sameValue(base, local) ? local : undefined;
  return mergeValues(base, local, remote);
}

function mergeValues(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...remote };
  const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
  for (const key of keys) {
    const before = base[key];
    const localValue = local[key];
    const remoteValue = remote[key];
    const localChanged = !sameValue(before, localValue);
    if (!localChanged) continue;
    const remoteChanged = !sameValue(before, remoteValue);
    if (!remoteChanged) {
      result[key] = localValue;
    } else if (
      additiveFields.has(key) &&
      typeof before === "number" &&
      typeof localValue === "number" &&
      typeof remoteValue === "number"
    ) {
      result[key] = remoteValue + (localValue - before);
    } else if (isIdArray(before) && isIdArray(localValue) && isIdArray(remoteValue)) {
      result[key] = mergeArray(before, localValue, remoteValue);
    } else if (isRecord(before) && isRecord(localValue) && isRecord(remoteValue)) {
      result[key] = mergeValues(before, localValue, remoteValue);
    } else {
      result[key] = localValue;
    }
  }
  return result;
}

function mergeArray(
  base: Array<Record<string, unknown> & { id: string }>,
  local: Array<Record<string, unknown> & { id: string }>,
  remote: Array<Record<string, unknown> & { id: string }>,
) {
  const baseById = new Map(base.map((item) => [item.id, item]));
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const orderedIds = [
    ...new Set([...local.map((item) => item.id), ...remote.map((item) => item.id)]),
  ];
  return orderedIds.flatMap((id) => {
    const merged = mergeRecord(baseById.get(id), localById.get(id), remoteById.get(id));
    return merged ? [merged as Record<string, unknown> & { id: string }] : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isIdArray(value: unknown): value is Array<Record<string, unknown> & { id: string }> {
  return (
    Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === "string")
  );
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function mergeSyncData(base: Data, local: Data, remote: Data): Data {
  return mergeValues(base, local, remote) as Data;
}

export function startSync() {
  let base: Data | null = null;
  let revision = 0;
  let applyingRemote = false;
  let requestInFlight = false;
  let pendingWrite = false;
  let writeTimer: ReturnType<typeof setTimeout> | undefined;
  let lastOfflineLog = false;

  const setStatus = (status: SyncStatus) => useSyncStatusStore.getState().setStatus(status);
  const apply = (data: Data) => {
    applyingRemote = true;
    useStore.getState().syncData(data);
    applyingRemote = false;
  };
  const request = async (method: "GET" | "POST" | "PUT", body?: unknown): Promise<SyncSnapshot> => {
    const response = await fetch("/api/state", {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok && response.status !== 409) {
      throw new Error(`Local sync server returned ${response.status}.`);
    }
    const result: unknown = await response.json();
    if (
      !isRecord(result) ||
      !Number.isInteger(result.revision) ||
      (result.state !== null && !isData(result.state))
    ) {
      throw new Error("The local sync server returned invalid data.");
    }
    return { ...(result as Omit<SyncSnapshot, "conflict">), conflict: response.status === 409 };
  };
  const markOffline = (error: unknown) => {
    setStatus("offline");
    if (!lastOfflineLog)
      console.warn("Local sync is unavailable; changes remain saved in this browser.", error);
    lastOfflineLog = true;
  };

  const scheduleWrite = () => {
    if (!base || writeTimer) return;
    writeTimer = setTimeout(() => {
      writeTimer = undefined;
      void pushLocal();
    }, 100);
  };

  const pushLocal = async () => {
    if (!base) return;
    if (requestInFlight) {
      pendingWrite = true;
      return;
    }
    const local = selectData();
    if (same(local, base)) return;
    requestInFlight = true;
    try {
      const response = await request("PUT", { state: local, revision });
      if (response.state === null) throw new Error("The local sync server has no saved state.");
      if (response.conflict) {
        const rebased = mergeSyncData(base, local, response.state);
        const latestLocal = selectData();
        const merged = same(local, latestLocal)
          ? rebased
          : mergeSyncData(local, latestLocal, rebased);
        base = response.state;
        revision = response.revision;
        apply(merged);
        scheduleWrite();
      } else {
        base = local;
        revision = response.revision;
      }
      setStatus("synced");
      lastOfflineLog = false;
    } catch (error) {
      markOffline(error);
    } finally {
      requestInFlight = false;
      if (pendingWrite) {
        pendingWrite = false;
        scheduleWrite();
      }
    }
  };

  const synchronize = async () => {
    if (requestInFlight) return;
    const localAtStart = selectData();
    requestInFlight = true;
    try {
      const response = await request("GET");
      if (response.state === null) {
        const initialized = await request("POST", { state: selectData() });
        if (!initialized.state) throw new Error("Unable to initialize the local sync server.");
        base = initialized.state;
        revision = initialized.revision;
        apply(base);
      } else if (!base) {
        base = response.state;
        revision = response.revision;
        const latestLocal = selectData();
        const merged = same(localAtStart, latestLocal)
          ? base
          : mergeSyncData(localAtStart, latestLocal, base);
        apply(merged);
        if (!same(merged, base)) scheduleWrite();
      } else if (response.revision !== revision) {
        const local = selectData();
        const merged = same(local, base)
          ? response.state
          : mergeSyncData(base, local, response.state);
        base = response.state;
        revision = response.revision;
        if (!same(local, merged)) apply(merged);
        if (!same(merged, response.state)) scheduleWrite();
      }
      setStatus("synced");
      lastOfflineLog = false;
      if (base && !same(selectData(), base)) scheduleWrite();
    } catch (error) {
      markOffline(error);
    } finally {
      requestInFlight = false;
      if (pendingWrite) {
        pendingWrite = false;
        scheduleWrite();
      }
    }
  };

  const unsubscribe = useStore.subscribe(() => {
    if (!applyingRemote && base && !same(selectData(), base)) scheduleWrite();
  });
  const pollTimer = setInterval(() => void synchronize(), 1200);
  const onOnline = () => void synchronize();
  window.addEventListener("online", onOnline);
  void synchronize();

  return () => {
    unsubscribe();
    clearInterval(pollTimer);
    clearTimeout(writeTimer);
    window.removeEventListener("online", onOnline);
  };
}
