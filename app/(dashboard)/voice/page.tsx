"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Container from "@/app/components/Container";
import EmbeddedComponentContainer from "@/app/components/EmbeddedComponentContainer";
import { CallLogs, Voicemails } from "@dialstack/sdk";
import {
  CalendarCheck,
  UserPlus,
  PhoneForwarded,
  AlertCircle,
} from "lucide-react";

// Practice-specific call insights (Spineline native content)
const callInsights = [
  {
    label: "Appointment Confirmations",
    value: "18",
    subtext: "12 confirmed, 6 pending callback",
    icon: CalendarCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    label: "New Patient Inquiries",
    value: "7",
    subtext: "4 scheduled, 3 need follow-up",
    icon: UserPlus,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    label: "Callback Requests",
    value: "5",
    subtext: "From voicemail today",
    icon: PhoneForwarded,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    label: "Urgent",
    value: "2",
    subtext: "Same-day appointment requests",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
];

// Patients awaiting callback (Spineline native content)
const pendingCallbacks = [
  {
    name: "Margaret Thompson",
    reason: "Reschedule adjustment",
    time: "Left VM 2h ago",
    phone: "(555) 234-5678",
  },
  {
    name: "Robert Chen",
    reason: "New patient - back pain",
    time: "Left VM 3h ago",
    phone: "(555) 345-6789",
  },
  {
    name: "Susan Williams",
    reason: "Insurance question",
    time: "Left VM 4h ago",
    phone: "(555) 456-7890",
  },
];

export default function VoicePage() {
  const { data: session } = useSession();
  const [dialstackUserId, setDialstackUserId] = useState<string | null>(null);

  // Fetch the DialStack user ID on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/dialstack/user");
        if (response.ok) {
          const user = await response.json();
          setDialstackUserId(user.id);
        }
      } catch (error) {
        console.error("Failed to fetch DialStack user:", error);
      }
    }
    if (session) {
      fetchUser();
    }
  }, [session]);

  if (!session) {
    redirect("/");
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Voice</h1>

      {/* Practice Insights - Native Spineline Content */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {callInsights.map((insight) => (
          <Container key={insight.label} className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                <insight.icon className={`w-5 h-5 ${insight.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{insight.value}</p>
                <p className="text-sm font-medium">{insight.label}</p>
                <p className="text-xs text-muted-foreground">
                  {insight.subtext}
                </p>
              </div>
            </div>
          </Container>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Pending Callbacks - Native Spineline Content */}
        <Container className="p-5 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Pending Callbacks</h2>
          <div className="space-y-3">
            {pendingCallbacks.map((patient) => (
              <div
                key={patient.phone}
                className="p-3 bg-slate-50 rounded-lg space-y-1"
              >
                <p className="font-medium text-sm">{patient.name}</p>
                <p className="text-xs text-muted-foreground">
                  {patient.reason}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {patient.time}
                  </span>
                  <button className="text-xs text-primary font-medium hover:underline">
                    Call Back
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 px-4 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
            View All Callbacks
          </button>
        </Container>

        {/* Call History - Embedded DialStack Component */}
        <Container className="p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Call History</h2>
          <EmbeddedComponentContainer>
            <CallLogs />
          </EmbeddedComponentContainer>
        </Container>
      </div>

      {/* Voicemails - Embedded DialStack Component */}
      <Container className="p-5">
        <h2 className="text-lg font-semibold mb-4">Voicemails</h2>
        <EmbeddedComponentContainer>
          {dialstackUserId ? (
            <Voicemails userId={dialstackUserId} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Loading voicemails...
            </p>
          )}
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
