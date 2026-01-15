'use client';
import AuthenticatedAndOnboardedRoute from '@/app/components/AuthenticatedAndOnboardedRoute';

import { ToolsPanelProvider } from '@/app/hooks/ToolsPanelProvider';
import { EmbeddedComponentWrapper } from '@/app/hooks/EmbeddedComponentWrapper';
import { ScreenPopProvider } from '@/app/components/screen-pop';
import { ScheduleDateProvider } from '@/app/hooks/ScheduleDateProvider';
import { SelectedAppointmentProvider } from '@/app/hooks/SelectedAppointmentProvider';
import { TimezoneProvider } from '@/app/hooks/TimezoneProvider';
import { DataRequest } from '../components/DataRequest';
import Screen from '../components/Screen';
import * as React from 'react';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthenticatedAndOnboardedRoute>
      <EmbeddedComponentWrapper>
        <ScreenPopProvider>
          <TimezoneProvider>
            <ScheduleDateProvider>
              <SelectedAppointmentProvider>
                <ToolsPanelProvider>
                  <DataRequest>
                    <Screen>{children}</Screen>
                  </DataRequest>
                </ToolsPanelProvider>
              </SelectedAppointmentProvider>
            </ScheduleDateProvider>
          </TimezoneProvider>
        </ScreenPopProvider>
      </EmbeddedComponentWrapper>
    </AuthenticatedAndOnboardedRoute>
  );
}
