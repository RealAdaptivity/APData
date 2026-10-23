import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isCompleteVehicle, vehicleKey, type Vehicle } from './vehicle';

/**
 * The vehicle on the lift. Every screen reads it, so a tech picks it once.
 * Kept in this browser (with the last few vehicles) so a page reload or the
 * phone locking does not lose it. Storage can be unavailable (private mode),
 * so every read and write tolerates failure.
 */

const CURRENT_KEY = 'apdata.vehicle';
const RECENT_KEY = 'apdata.recentVehicles';
const MAX_RECENT = 8;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the vehicle still works for this visit */
  }
}

type VehicleApi = {
  vehicle: Vehicle | null;
  recent: Vehicle[];
  setVehicle: (v: Vehicle) => void;
  clearVehicle: () => void;
  forgetRecent: (v: Vehicle) => void;
};

const VehicleContext = createContext<VehicleApi | null>(null);

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [vehicle, setCurrent] = useState<Vehicle | null>(() => {
    const v = load<Vehicle | null>(CURRENT_KEY, null);
    return isCompleteVehicle(v) ? v : null;
  });
  const [recent, setRecent] = useState<Vehicle[]>(() => load<Vehicle[]>(RECENT_KEY, []).filter(isCompleteVehicle));

  const setVehicle = useCallback((v: Vehicle) => {
    const clean: Vehicle = {
      ...v,
      year: v.year.trim(),
      make: v.make.trim(),
      model: v.model.trim(),
      engine: v.engine?.trim() || undefined,
      trim: v.trim?.trim() || undefined,
    };
    setCurrent(clean);
    save(CURRENT_KEY, clean);
    setRecent((list) => {
      const key = vehicleKey(clean);
      const next = [clean, ...list.filter((x) => vehicleKey(x) !== key && (!clean.vin || x.vin !== clean.vin))].slice(
        0,
        MAX_RECENT
      );
      save(RECENT_KEY, next);
      return next;
    });
  }, []);

  const clearVehicle = useCallback(() => {
    setCurrent(null);
    save(CURRENT_KEY, null);
  }, []);

  const forgetRecent = useCallback((v: Vehicle) => {
    setRecent((list) => {
      const next = list.filter((x) => vehicleKey(x) !== vehicleKey(v));
      save(RECENT_KEY, next);
      return next;
    });
  }, []);

  const api = useMemo(
    () => ({ vehicle, recent, setVehicle, clearVehicle, forgetRecent }),
    [vehicle, recent, setVehicle, clearVehicle, forgetRecent]
  );
  return <VehicleContext.Provider value={api}>{children}</VehicleContext.Provider>;
}

export function useVehicle(): VehicleApi {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicle outside VehicleProvider');
  return ctx;
}
