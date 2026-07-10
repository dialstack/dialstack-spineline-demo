'use client';
import AuthenticatedAndOnboardedRoute from '@/app/components/AuthenticatedAndOnboardedRoute';

import { ToolsPanelProvider } from '@/app/hooks/ToolsPanelProvider';
import { EmbeddedComponentWrapper } from '@/app/hooks/EmbeddedComponentWrapper';
import { SoftphoneDrawerProvider } from '@/app/hooks/SoftphoneDrawerProvider';
import { SoftphonePanel } from '@/app/components/softphone/SoftphonePanel';
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
        {/* SoftphoneDrawerProvider wraps ScreenPopProvider so ScreenPop can read the
            softphone-enabled flag: when the softphone is on, the incoming-call
            surface IS the softphone drawer, so ScreenPop suppresses itself. */}
        <SoftphoneDrawerProvider>
          <ScreenPopProvider>
            <TimezoneProvider>
              <ScheduleDateProvider>
                <SelectedAppointmentProvider>
                  <ToolsPanelProvider>
                    <DataRequest>
                      <Screen>{children}</Screen>
                    </DataRequest>
                    {/* Always-mounted softphone: persistent WebRTC session so an
                        incoming call auto-opens the panel from any page. */}
                    <SoftphonePanel />
                  </ToolsPanelProvider>
                </SelectedAppointmentProvider>
              </ScheduleDateProvider>
            </TimezoneProvider>
          </ScreenPopProvider>
        </SoftphoneDrawerProvider>
      </EmbeddedComponentWrapper>
    </AuthenticatedAndOnboardedRoute>
  );
}
