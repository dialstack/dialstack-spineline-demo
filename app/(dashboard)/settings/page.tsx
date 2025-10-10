"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Container from "@/app/components/Container";
import EditPasswordButton from "@/app/components/EditPasswordButton";
import EditEmailButton from "@/app/components/EditEmailButton";

const fetchAccountInfo = async () => {
  const res = await fetch("/api/account_info", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch account info: ${res.status}`);
  }

  return res.json();
};

export default function Settings() {
  const {
    data: accountData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accountInfo"],
    queryFn: fetchAccountInfo,
  });

  const practiceName = accountData?.businessName || "";
  const email = accountData?.email || "";

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
          </div>
        )}
      </Container>
    </>
  );
}
