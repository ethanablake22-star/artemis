import React from 'react';
import { TabProvider } from './state/TabContext';
import { LauncherProvider } from './state/LauncherContext';
import { LibraryProvider } from './state/LibraryContext';
import { AutomotiveProvider } from './state/AutomotiveContext';
import { WindowShell } from './components/layout/WindowShell';
import { TabHost } from './components/tabs/TabHost';

export const App: React.FC = () => {
  return (
    <TabProvider>
      <LauncherProvider>
        <LibraryProvider>
          <AutomotiveProvider>
            <WindowShell>
              <TabHost />
            </WindowShell>
          </AutomotiveProvider>
        </LibraryProvider>
      </LauncherProvider>
    </TabProvider>
  );
};

export default App;
