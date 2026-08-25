export type CurrentMissionResourceType = 'work-order' | 'schedule-event' | 'document';

export interface CurrentMissionReference {
  resourceType: CurrentMissionResourceType;
  resourceId: string;
  setAt: number;
}

export interface SetCurrentMissionOptions {
  resourceType: CurrentMissionResourceType;
  resourceId: string;
}

export interface ArtemisHomeStoreData {
  schemaVersion: 1;
  currentMission: CurrentMissionReference | null;
}

export interface HomeBridge {
  getCurrentMission: () => Promise<CurrentMissionReference | null>;
  setCurrentMission: (options: SetCurrentMissionOptions) => Promise<CurrentMissionReference>;
  clearCurrentMission: () => Promise<boolean>;
}

export interface IHomeStorageRepository {
  getCurrentMission(): Promise<CurrentMissionReference | null>;
  setCurrentMission(options: SetCurrentMissionOptions): Promise<CurrentMissionReference>;
  clearCurrentMission(): Promise<boolean>;
}
