import { type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import Practice from "@/app/models/practice";
import dbConnect from "@/lib/dbConnect";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const { newPassword } = json;

    if (!newPassword) {
      return new Response(JSON.stringify({ error: "New password required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await dbConnect();

    // Update the password and set changedPassword flag
    const updates = {
      password: newPassword,
      changedPassword: true,
    };

    await Practice.update(token.email, updates);

    logger.info({ email: token.email }, "Password updated successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when updating account password");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
