"use client";

import React from "react";
import Schedule from "@/app/components/Schedule";
import Container from "@/app/components/Container";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { data: session } = useSession();
  if (!session) {
    redirect("/");
  }

  return (
    <>
      <h1 className="text-3xl font-bold" data-testid="title-header">
        Welcome back!
      </h1>
      <div className="flex flex-col items-start gap-2 md:gap-5">
        <Container className="flex w-full flex-1 flex-col p-5">
          <Schedule />
        </Container>
      </div>
    </>
  );
}
