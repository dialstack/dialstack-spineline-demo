import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dialstack } from "@/lib/dialstack";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.dialstackAccountId) {
      return new Response(
        JSON.stringify({
          error: "No authenticated user found",
        }),
        { status: 401 },
      );
    }

    const accountId = session.user.dialstackAccountId;
    const platformId = process.env.DIALSTACK_PLATFORM_ID;

    if (!platformId) {
      console.error("Missing DIALSTACK_PLATFORM_ID environment variable");
      return new Response(
        JSON.stringify({
          error: "DialStack configuration missing",
        }),
        { status: 500 },
      );
    }

    const dialstackSession = await dialstack.sessions.create({
      platform_id: platformId,
      account_id: accountId,
    });

    return new Response(
      JSON.stringify({
        client_secret: dialstackSession.client_secret,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(
      "An error occurred when calling the DialStack API to create a session",
      error,
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
    });
  }
}
