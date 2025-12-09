"use client";

import schedule from "@/app/data/schedule.json";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Patient } from "@/app/models/patient";

const SCHEDULE_HEIGHT = 1440;
const MINUTES_IN_BUSINESS_DAY = 600;

/**
 * Fetch patients from the API
 */
const fetchPatients = async (): Promise<Patient[]> => {
  const res = await fetch("/api/patients", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch patients: ${res.status}`);
  }

  return res.json();
};

const getCurrentDate = () => {
  const currentDate = new Date();
  const options = {
    weekday: "long",
    month: "long",
    day: "numeric",
  } as Intl.DateTimeFormatOptions;
  return currentDate.toLocaleDateString("en-US", options);
};

function getMinutesSince9AM() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const targetHour = 9; // 9 AM

  let minutesSince9AM = 0;

  if (currentHour > targetHour) {
    // Calculate minutes after 9 AM
    minutesSince9AM = (currentHour - targetHour) * 60 + currentMinute;
  } else if (currentHour === targetHour) {
    // It's 9 AM or later, but before 10 AM
    minutesSince9AM = currentMinute;
  } else {
    // It's before 9 AM, so calculate minutes until tomorrow's 9 AM
    minutesSince9AM = (24 - targetHour + currentHour) * 60 - currentMinute;
  }

  return minutesSince9AM;
}

const renderDayProgressBar = () => {
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
      <div className="relative left-0 top-[-3px] h-2 w-2 rounded-full border-2 border-accent bg-accent"></div>
    </div>
  );
};

const renderHourBlock = (hour: string) => {
  return (
    <div className="flex h-36 flex-row">
      <div className="w-12 text-sm text-subdued">
        <div className="-translate-y-[50%]">{hour}</div>
      </div>
      <div className="grid flex-1 grid-cols-1 divide-y border-t-2">
        <div></div>
        <div></div>
      </div>
    </div>
  );
};

const Schedule = () => {
  // Fetch patients from the API
  const {
    data: patients,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  // Create a lookup map for patients by ID
  const patientMap = new Map<number, Patient>();
  if (patients) {
    patients.forEach((patient) => {
      if (patient.id) {
        patientMap.set(patient.id, patient);
      }
    });
  }

  // Count total appointments in the schedule
  const totalAppointments = schedule.reduce(
    (total, provider) => total + provider.sessions.length,
    0,
  );

  // Create a mapping from schedule patient_id to actual patient IDs
  const scheduleToActualPatientMap = new Map<number, Patient>();
  if (patients && patients.length > 0) {
    // Only map up to the number of available patients (no cycling/reuse)
    const mappingCount = Math.min(totalAppointments, patients.length);
    for (let i = 0; i < mappingCount; i++) {
      const scheduleId = i + 1;
      const actualPatient = patients[i];
      scheduleToActualPatientMap.set(scheduleId, actualPatient);
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative space-y-4">
        <div className="flex justify-between gap-2 sm:items-center">
          <h1 className="text-xl font-bold">Today&apos;s schedule</h1>
          <div className="font-bold text-accent">{getCurrentDate()}</div>
        </div>
        <div className="relative left-0 z-30 flex w-full flex-row">
          {renderDayProgressBar()}
        </div>
        <div className="ml-10 flex flex-row">
          {schedule.map(({ id, provider }) => (
            <h2
              key={id}
              className="ml-8 flex flex-1 flex-row items-center space-x-1 text-lg font-bold last:hidden md:last:flex"
            >
              <div>{provider}</div>
              <ChevronDown color="#6c7688" />
            </h2>
          ))}
        </div>
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
          <div className="relative flex bg-screen-foreground">
            <div className="absolute z-10 w-full flex-1">
              {renderHourBlock("9 AM")}
              {renderHourBlock("10 AM")}
              {renderHourBlock("11 AM")}
              {renderHourBlock("12 PM")}
              {renderHourBlock("1 PM")}
              {renderHourBlock("2 PM")}
              {renderHourBlock("3 PM")}
              {renderHourBlock("4 PM")}
              {renderHourBlock("5 PM")}
              {renderHourBlock("6 PM")}
            </div>
            <div className="relative top-0 z-20 flex h-[1440px] w-full flex-row gap-4 pl-16">
              {schedule.map(({ id, sessions }) => {
                return (
                  <div
                    key={id}
                    className="relative flex flex-grow flex-col last:hidden md:last:flex"
                  >
                    {sessions.map(
                      ({
                        id: sessionId,
                        name,
                        startTime,
                        endTime,
                        startTimeMinutes,
                        endTimeMinutes,
                        patient_id,
                        appointmentType,
                      }) => {
                        // Get the patient from the schedule mapping
                        const patient =
                          scheduleToActualPatientMap.get(patient_id);

                        // Skip this appointment if patient doesn't exist
                        if (!patient) {
                          return null;
                        }

                        const badge =
                          appointmentType === "initial" ? (
                            <Badge variant="blue">Initial</Badge>
                          ) : appointmentType === "walkin" ? (
                            <Badge variant="red">Walk-in</Badge>
                          ) : null;

                        const duration = endTimeMinutes - startTimeMinutes;
                        const isShort = duration < 20;
                        const padding = isShort ? "p-2" : "p-3";
                        const spacing = isShort ? "space-y-1" : "space-y-2";

                        return (
                          <div
                            key={sessionId}
                            className={`group absolute flex w-full cursor-pointer flex-col overflow-hidden rounded-md border bg-offset bg-screen-background ${padding} ${spacing} text-primary transition-all duration-150 hover:z-[100] hover:scale-[1.01] hover:bg-screen-foreground hover:shadow-md hover:!h-auto hover:min-h-[100px]`}
                            style={{
                              height: `${Math.round(
                                (SCHEDULE_HEIGHT *
                                  (endTimeMinutes - startTimeMinutes)) /
                                  MINUTES_IN_BUSINESS_DAY,
                              )}px`,
                              top: `${Math.round(
                                (SCHEDULE_HEIGHT * startTimeMinutes) /
                                  MINUTES_IN_BUSINESS_DAY,
                              )}px`,
                            }}
                          >
                            {badge && (
                              <div className="absolute top-2 right-2">
                                {badge}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium flex items-center gap-2">
                                <span className="text-accent">
                                  {startTime} - {endTime}
                                </span>
                                <span className="font-semibold truncate group-hover:whitespace-normal">
                                  {patient.first_name} {patient.last_name}
                                </span>
                              </div>
                              <div
                                className={`text-sm text-subdued ${isShort ? "hidden group-hover:block" : "truncate group-hover:whitespace-normal"}`}
                              >
                                {name}
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
