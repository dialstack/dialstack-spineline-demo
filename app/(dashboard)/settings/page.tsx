"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Container from "@/app/components/Container";
import EditPasswordButton from "@/app/components/EditPasswordButton";
import EditEmailButton from "@/app/components/EditEmailButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAccountInfo, updateTimezone } from "@/lib/api/account";

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

export default function Settings() {
  const queryClient = useQueryClient();

  const {
    data: accountData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accountInfo"],
    queryFn: fetchAccountInfo,
  });

  const timezoneMutation = useMutation({
    mutationFn: updateTimezone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountInfo"] });
    },
  });

  const practiceName = accountData?.businessName || "";
  const email = accountData?.email || "";
  const timezone = accountData?.timezone || "America/New_York";

  return (
    <>
      <Container className="pl-5">
        <div className="flex flex-row justify-between">
          <h1 className="mb-4 text-xl font-semibold">Details</h1>
          <div className="flex flex-col gap-0.5 text-right align-top text-sm font-semibold text-accent">
            <EditEmailButton />
            <EditPasswordButton />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2">
            <LoaderCircle className="animate-spin" size={16} />
            <span className="text-sm text-subdued">Loading...</span>
          </div>
        )}

        {error && <div className="text-sm text-red-600">Error</div>}

        {!isLoading && !error && (
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-20">
            <div>
              <div className="text-subdued">Practice name</div>
              <div className="font-medium">{practiceName}</div>
            </div>
            <div>
              <div className="text-subdued">Email</div>
              <div className="font-medium">{email}</div>
            </div>
            <div>
              <div className="text-subdued">Time zone</div>
              <Select
                value={timezone}
                onValueChange={(value) => timezoneMutation.mutate(value)}
                disabled={timezoneMutation.isPending}
              >
                <SelectTrigger className="mt-1 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {US_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {timezoneMutation.isError && (
                <div className="mt-1 text-sm text-red-600">
                  Failed to save timezone
                </div>
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
