import React from 'react';
import { MissionSection } from './MissionSection';
import { RecentFilesSection } from './RecentFilesSection';
import { ScheduleSection } from './ScheduleSection';
import { ActiveWorkSection } from './ActiveWorkSection';
import { NotificationsSection } from './NotificationsSection';

export const HomeTab: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Current Mission Hero */}
      <MissionSection />

      {/* Grid of Sections: Active Work, Schedule, Recent Files, Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveWorkSection />
        <RecentFilesSection />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleSection />
        <NotificationsSection />
      </div>
    </div>
  );
};
