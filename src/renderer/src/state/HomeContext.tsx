import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  CurrentMissionReference,
  SetCurrentMissionOptions,
  CurrentMissionResourceType,
} from '@shared/homeTypes';
import { homeRepository } from '../services/homeStorage';

interface HomeContextValue {
  currentMission: CurrentMissionReference | null;
  isLoading: boolean;
  error: string | null;
  setCurrentMission: (options: SetCurrentMissionOptions) => Promise<CurrentMissionReference>;
  clearCurrentMission: () => Promise<boolean>;
  refreshCurrentMission: () => Promise<void>;
  isCurrentMission: (resourceType: CurrentMissionResourceType, resourceId: string) => boolean;
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const [currentMission, setCurrentMissionState] = useState<CurrentMissionReference | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCurrentMission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const mission = await homeRepository.getCurrentMission();
      setCurrentMissionState(mission);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCurrentMission();
  }, [refreshCurrentMission]);

  const handleSetCurrentMission = useCallback(
    async (options: SetCurrentMissionOptions): Promise<CurrentMissionReference> => {
      try {
        setError(null);
        const ref = await homeRepository.setCurrentMission(options);
        setCurrentMissionState(ref);
        return ref;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleClearCurrentMission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const res = await homeRepository.clearCurrentMission();
      setCurrentMissionState(null);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  }, []);

  const isCurrentMission = useCallback(
    (resourceType: CurrentMissionResourceType, resourceId: string): boolean => {
      return (
        !!currentMission &&
        currentMission.resourceType === resourceType &&
        currentMission.resourceId === resourceId
      );
    },
    [currentMission]
  );

  const value = useMemo(
    () => ({
      currentMission,
      isLoading,
      error,
      setCurrentMission: handleSetCurrentMission,
      clearCurrentMission: handleClearCurrentMission,
      refreshCurrentMission,
      isCurrentMission,
    }),
    [
      currentMission,
      isLoading,
      error,
      handleSetCurrentMission,
      handleClearCurrentMission,
      refreshCurrentMission,
      isCurrentMission,
    ]
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error('useHome must be used within a HomeProvider');
  }
  return context;
}
