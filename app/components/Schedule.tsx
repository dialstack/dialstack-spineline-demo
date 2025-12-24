"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useScheduleDate } from "@/app/hooks/ScheduleDateProvider";
import type { Patient } from "@/app/models/patient";
import type { Provider } from "@/app/models/provider";
import type { Appointment, AppointmentType } from "@/app/models/appointment";

const SCHEDULE_HEIGHT = 1440;
const MINUTES_IN_BUSINESS_DAY = 600; // 9 AM to 7 PM = 10 hours = 600 minutes

interface ScheduleProps {
  onAppointmentClick?: (appointmentId: number) => void;
}

/**
 * Fetch patients from the API
 */
const fetchPatients = async (): Promise<Patient[]> => {
  const res = await fetch("/api/patients");
  if (!res.ok) {
    throw new Error(`Failed to fetch patients: ${res.status}`);
  }
  return res.json();
};

/**
 * Fetch providers from the API
 */
const fetchProviders = async (): Promise<Provider[]> => {
  const res = await fetch("/api/providers");
  if (!res.ok) {
    throw new Error(`Failed to fetch providers: ${res.status}`);
  }
  return res.json();
};

/**
 * Fetch appointments for a date range
 */
const fetchAppointments = async (
  start: Date,
  end: Date,
): Promise<Appointment[]> => {
  const params = new URLSearchParams({
    start: start.toISOString(),
    end: end.toISOString(),
  });
  const res = await fetch(`/api/appointments?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch appointments: ${res.status}`);
  }
  return res.json();
};

/**
 * Format a date for display
 */
const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

/**
 * Get minutes since 9 AM for positioning the current time indicator
 */
function getMinutesSince9AM(): number {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const targetHour = 9;

  if (currentHour >= targetHour && currentHour < 19) {
    return (currentHour - targetHour) * 60 + currentMinute;
  }
  return -1; // Outside business hours
}

/**
 * Get start of day (midnight)
 */
const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day (11:59:59 PM)
 */
const getEndOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get appointment type badge
 */
const getTypeBadge = (type: AppointmentType) => {
  switch (type) {
    case "initial":
      return <Badge variant="blue">Initial</Badge>;
    case "walk_in":
      return <Badge variant="red">Walk-in</Badge>;
    case "follow_up":
      return <Badge variant="default">Follow-up</Badge>;
    default:
      return null; // "adjustment" is default, no badge
  }
};

/**
 * Render the current time indicator
 */
const CurrentTimeIndicator = () => {
  const minutesSince9AM = getMinutesSince9AM();

  if (minutesSince9AM < 0 || minutesSince9AM > MINUTES_IN_BUSINESS_DAY) {
    return null;
  }

  return (
    <div
      className="absolute left-[40px] z-30 h-[2px] w-[calc(100%-35px)] bg-accent"
      style={{
        top: `${(SCHEDULE_HEIGHT * minutesSince9AM) / MINUTES_IN_BUSINESS_DAY + 60}px`,
      }}
    >
      <div className="relative left-0 top-[-3px] h-2 w-2 rounded-full border-2 border-accent bg-accent" />
    </div>
  );
};

/**
 * Render an hour block in the schedule grid
 */
const HourBlock = ({
  hour,
  columnCount,
}: {
  hour: string;
  columnCount: number;
}) => (
  <div className="flex h-36 flex-row">
    <div className="w-12 text-sm text-subdued">
      <div className="-translate-y-[50%]">{hour}</div>
    </div>
    <div
      className="grid flex-1 divide-y border-t-2"
      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
    >
      {Array.from({ length: columnCount }).map((_, i) => (
        <div key={`top-${i}`} className="border-r last:border-r-0" />
      ))}
      {Array.from({ length: columnCount }).map((_, i) => (
        <div key={`bottom-${i}`} className="border-r last:border-r-0" />
      ))}
    </div>
  </div>
);

const Schedule = ({ onAppointmentClick }: ScheduleProps) => {
  const { selectedDate, setSelectedDate } = useScheduleDate();

  // Fetch patients
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  // Fetch providers
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  // Fetch appointments for selected date
  const {
    data: appointments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["appointments", selectedDate.toISOString()],
    queryFn: () =>
      fetchAppointments(getStartOfDay(selectedDate), getEndOfDay(selectedDate)),
  });

  // Create patient lookup map
  const patientMap = useMemo(() => {
    const map = new Map<number, Patient>();
    if (patients) {
      patients.forEach((patient) => {
        if (patient.id) {
          map.set(patient.id, patient);
        }
      });
    }
    return map;
  }, [patients]);

  // Group appointments by provider
  const appointmentsByProvider = useMemo(() => {
    const map = new Map<number | null, Appointment[]>();

    // Initialize with empty arrays for each provider
    if (providers) {
      providers.forEach((provider) => {
        if (provider.id) {
          map.set(provider.id, []);
        }
      });
    }

    // Also track unassigned appointments
    map.set(null, []);

    // Group appointments
    if (appointments) {
      appointments.forEach((appointment) => {
        const providerId = appointment.provider_id || null;
        const list = map.get(providerId) || [];
        list.push(appointment);
        map.set(providerId, list);
      });
    }

    return map;
  }, [appointments, providers]);

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  // Navigate to today
  const goToToday = () => {
    setSelectedDate(getStartOfDay(new Date()));
  };

  const isToday =
    getStartOfDay(new Date()).getTime() === selectedDate.getTime();

  const columnCount = providers?.length || 1;

  // Render a single appointment card
  const renderAppointment = (appointment: Appointment) => {
    const startAt = new Date(appointment.start_at);
    const endAt = new Date(appointment.end_at);

    // Calculate position (minutes since 9 AM)
    const startMinutes = (startAt.getHours() - 9) * 60 + startAt.getMinutes();
    const endMinutes = (endAt.getHours() - 9) * 60 + endAt.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    // Skip appointments outside business hours
    if (startMinutes < 0 || startMinutes >= MINUTES_IN_BUSINESS_DAY) {
      return null;
    }

    const patient = appointment.patient_id
      ? patientMap.get(appointment.patient_id)
      : null;

    const badge = getTypeBadge(appointment.type);
    const isShort = durationMinutes < 20;
    const padding = isShort ? "p-2" : "p-3";
    const spacing = isShort ? "space-y-1" : "space-y-2";

    const startTimeStr = startAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTimeStr = endAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const patientName = patient
      ? `${patient.first_name} ${patient.last_name}`
      : "No patient assigned";

    return (
      <div
        key={appointment.id}
        onClick={() => onAppointmentClick?.(appointment.id as number)}
        className={`group absolute left-1 right-1 flex cursor-pointer flex-col overflow-hidden rounded-md border bg-offset bg-screen-background ${padding} ${spacing} text-primary transition-all duration-150 hover:z-[100] hover:scale-[1.02] hover:bg-screen-foreground hover:shadow-md hover:!h-auto hover:min-h-[100px]`}
        style={{
          height: `${Math.round((SCHEDULE_HEIGHT * durationMinutes) / MINUTES_IN_BUSINESS_DAY)}px`,
          top: `${Math.round((SCHEDULE_HEIGHT * startMinutes) / MINUTES_IN_BUSINESS_DAY)}px`,
        }}
      >
        {badge && <div className="absolute right-2 top-2">{badge}</div>}
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-accent">
              {startTimeStr} - {endTimeStr}
            </span>
            <span className="truncate font-semibold group-hover:whitespace-normal">
              {patientName}
            </span>
          </div>
          <div
            className={`text-sm text-subdued ${isShort ? "hidden group-hover:block" : "truncate group-hover:whitespace-normal"}`}
          >
            {appointment.notes || appointment.type}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="relative space-y-4">
        {/* Header with date navigation */}
        <div className="flex justify-between gap-2 sm:items-center">
          <h1 className="text-xl font-bold">
            {isToday ? "Today's schedule" : "Schedule"}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={goToToday}
              className="font-bold text-accent hover:underline"
            >
              {formatDate(selectedDate)}
            </button>
            <Button variant="ghost" size="sm" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Current time indicator (only on today) */}
        {isToday && (
          <div className="relative left-0 z-30 flex w-full flex-row">
            <CurrentTimeIndicator />
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <LoaderCircle className="animate-spin" size={24} />
            <span className="text-sm text-subdued">Loading schedule...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-subdued">
              Unable to load schedule. Please try again.
            </p>
          </div>
        ) : (
          <div className="relative flex flex-col bg-screen-foreground">
            {/* Provider headers */}
            {providers && providers.length > 0 && (
              <div className="flex border-b">
                <div className="w-12" /> {/* Spacer for time column */}
                <div
                  className="grid flex-1"
                  style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
                >
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="border-r px-2 py-3 text-center last:border-r-0"
                    >
                      <div className="font-semibold text-primary">
                        {provider.first_name} {provider.last_name}
                      </div>
                      {provider.specialty && (
                        <div className="text-xs text-subdued">
                          {provider.specialty}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule grid */}
            <div className="relative">
              {/* Hour grid */}
              <div className="absolute z-10 w-full flex-1">
                <HourBlock hour="9 AM" columnCount={columnCount} />
                <HourBlock hour="10 AM" columnCount={columnCount} />
                <HourBlock hour="11 AM" columnCount={columnCount} />
                <HourBlock hour="12 PM" columnCount={columnCount} />
                <HourBlock hour="1 PM" columnCount={columnCount} />
                <HourBlock hour="2 PM" columnCount={columnCount} />
                <HourBlock hour="3 PM" columnCount={columnCount} />
                <HourBlock hour="4 PM" columnCount={columnCount} />
                <HourBlock hour="5 PM" columnCount={columnCount} />
                <HourBlock hour="6 PM" columnCount={columnCount} />
              </div>

              {/* Appointments by provider */}
              <div
                className="relative top-0 z-20 flex h-[1440px] w-full flex-row pl-12"
                style={{ minWidth: `${columnCount * 200}px` }}
              >
                {providers && providers.length > 0 ? (
                  providers.map((provider) => {
                    const providerAppointments =
                      appointmentsByProvider.get(provider.id!) || [];
                    return (
                      <div
                        key={provider.id}
                        className="relative flex-1 border-r last:border-r-0"
                      >
                        {providerAppointments.map(renderAppointment)}
                      </div>
                    );
                  })
                ) : (
                  <div className="relative flex flex-grow flex-col">
                    {appointments && appointments.length === 0 && (
                      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 text-center">
                        <p className="text-sm text-subdued">
                          No appointments scheduled
                        </p>
                      </div>
                    )}
                    {appointments?.map(renderAppointment)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
