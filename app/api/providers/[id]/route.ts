import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Provider from "@/app/models/provider";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

/**
 * GET /api/providers/[id]
 * Returns a single provider
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return new Response("Invalid provider ID", { status: 400 });
    }

    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const provider = await Provider.findById(providerId, practice.id);

    if (!provider) {
      return new Response("Provider not found", { status: 404 });
    }

    return new Response(JSON.stringify(provider), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when retrieving provider");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}

/**
 * PATCH /api/providers/[id]
 * Updates a provider's details
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return new Response("Invalid provider ID", { status: 400 });
    }

    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const body = await req.json();

    const allowedFields = ["first_name", "last_name", "specialty"];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response("No valid fields to update", { status: 400 });
    }

    const updatedProvider = await Provider.update(
      providerId,
      practice.id,
      updates,
    );

    if (!updatedProvider) {
      return new Response("Provider not found", { status: 404 });
    }

    return new Response(JSON.stringify(updatedProvider), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when updating provider");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}

/**
 * DELETE /api/providers/[id]
 * Deletes a provider
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return new Response("Invalid provider ID", { status: 400 });
    }

    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response("Practice not found", { status: 404 });
    }

    const deleted = await Provider.delete(providerId, practice.id);

    if (!deleted) {
      return new Response("Provider not found", { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred when deleting provider");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(message, { status: 500 });
  }
}
