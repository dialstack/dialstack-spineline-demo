import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }
    await dbConnect();
    const user = await Practice.findByEmail(token.email);

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    return new Response(
      JSON.stringify({
        changedPassword: user.changedPassword || false,
        password: user.changedPassword ? "" : user.password || "",
        businessName: user.businessName || "",
        setup: user.setup || false,
        email: user.email || "",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when retrieving account info");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}
