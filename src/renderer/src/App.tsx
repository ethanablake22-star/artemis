import React from 'react';
import { TabProvider } from './state/TabContext';
import { LauncherProvider } from './state/LauncherContext';
import { LibraryProvider } from './state/LibraryContext';
import { AutomotiveProvider } from './state/AutomotiveContext';
import { ScheduleProvider } from './state/ScheduleContext';
import { WindowShell } from './components/layout/WindowShell';
import { TabHost } from './components/tabs/TabHost';

export const App: React.FC = () => {
  return (
    <TabProvider>
      <LauncherProvider>
        <LibraryProvider>
          <AutomotiveProvider>
            <ScheduleProvider>
              <WindowShell>
                <TabHost />
              </WindowShell>
            </ScheduleProvider>
          </AutomotiveProvider>
        </LibraryProvider>
      </LauncherProvider>
    </TabProvider>
  );
};

export default App;
