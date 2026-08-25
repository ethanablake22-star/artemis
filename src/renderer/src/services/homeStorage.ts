import type {
  CurrentMissionReference,
  SetCurrentMissionOptions,
  IHomeStorageRepository,
} from '@shared/homeTypes';

const LOCAL_STORAGE_KEY = 'artemis_home_store_dev';

export class LocalHomeRepository implements IHomeStorageRepository {
  private isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.artemisAPI?.home;
  }

  async getCurrentMission(): Promise<CurrentMissionReference | null> {
    if (this.isElectron()) {
      return window.artemisAPI!.home.getCurrentMission();
    }

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data.currentMission || null;
    } catch {
      return null;
    }
  }

  async setCurrentMission(options: SetCurrentMissionOptions): Promise<CurrentMissionReference> {
    if (this.isElectron()) {
      return window.artemisAPI!.home.setCurrentMission(options);
    }

    const ref: CurrentMissionReference = {
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      setAt: Date.now(),
    };

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : { schemaVersion: 1 };
      data.currentMission = ref;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    return ref;
  }

  async clearCurrentMission(): Promise<boolean> {
    if (this.isElectron()) {
      return window.artemisAPI!.home.clearCurrentMission();
    }

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        data.currentMission = null;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to clear in localStorage:', e);
    }

    return true;
  }
}

export const homeRepository = new LocalHomeRepository();
