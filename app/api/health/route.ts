import { NextResponse } from "next/server";

export async function GET() {
  const healthData = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || "development",
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: await checkDatabase(),
      memory: getMemoryUsage(),
    },
  };

  return NextResponse.json(healthData, { status: 200 });
}

async function checkDatabase(): Promise<{
  status: "healthy" | "unhealthy";
  message?: string;
}> {
  try {
    // Basic database connectivity check
    // In a real application, you would check your database connection here
    // For now, we'll just simulate a successful check
    return { status: "healthy" };
  } catch (error) {
    return {
      status: "unhealthy",
      message:
        error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  };
}
