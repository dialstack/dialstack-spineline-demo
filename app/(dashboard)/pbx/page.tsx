"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Container from "@/app/components/Container";
import EmbeddedComponentContainer from "@/app/components/EmbeddedComponentContainer";
import { CallLogs } from "@dialstack/sdk";

export default function PBXPage() {
  const { data: session } = useSession();

  if (!session) {
    redirect("/");
  }

  return (
    <>
      <h1 className="text-3xl font-bold">PBX</h1>
      <Container className="flex w-full flex-1 flex-col p-5">
        <h2 className="text-xl font-bold mb-4">Recent Calls</h2>
        <EmbeddedComponentContainer>
          <CallLogs limit={50} />
        </EmbeddedComponentContainer>
      </Container>
    </>
  );
}
