import { NextRequest } from "next/server";
import Practice from "@/app/models/practice";
import Patient from "@/app/models/patient";
import dbConnect from "@/lib/dbConnect";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

// Lists of names for generating dummy patients
const FIRST_NAMES = [
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Ava",
  "Ethan",
  "Sophia",
  "Mason",
  "Isabella",
  "William",
  "Mia",
  "James",
  "Charlotte",
  "Benjamin",
  "Amelia",
  "Lucas",
  "Harper",
  "Henry",
  "Evelyn",
  "Alexander",
  "Abigail",
  "Michael",
  "Emily",
  "Daniel",
  "Elizabeth",
  "Matthew",
  "Sofia",
  "Joseph",
  "Avery",
  "David",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
];

/**
 * Generate a random date between two dates
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

/**
 * Generate a random phone number in E.164 format
 * Uses 555 area code (reserved for fictional use)
 */
function generatePhoneNumber(): string {
  // Generate 7 random digits for the subscriber number
  const subscriberNumber = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, "0");
  return `+1555${subscriberNumber}`;
}

/**
 * Generate dummy patient data
 */
function generatePatient() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  const phone = generatePhoneNumber();

  // Generate date of birth between 1950 and 2000
  const dateOfBirth = randomDate(new Date(1950, 0, 1), new Date(2000, 11, 31));

  return {
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    date_of_birth: dateOfBirth,
    status: "active",
  };
}

/**
 * POST /api/testdata/patients
 * Creates test patients for the authenticated practice
 */
export async function POST(req: NextRequest) {
  try {
    // Get authentication token
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const count = parseInt(body.count, 10);

    if (!count || count < 1 || count > 20) {
      return new Response(
        JSON.stringify({ error: "Invalid count. Must be between 1 and 20." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Connect to database
    await dbConnect();

    // Find the practice by email
    const practice = await Practice.findByEmail(token.email);

    if (!practice || !practice.id) {
      return new Response(JSON.stringify({ error: "Practice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate and create patients
    const createdPatients = [];
    for (let i = 0; i < count; i++) {
      const patientData = generatePatient();

      try {
        const patient = await Patient.create(practice.id, patientData);
        createdPatients.push(patient);
      } catch (error) {
        // If there's a duplicate email constraint error, try again with a different combination
        logger.warn(
          { error, patientData },
          "Failed to create patient, possibly duplicate email",
        );
        // Continue to next iteration
        continue;
      }
    }

    logger.info(
      { practiceId: practice.id, count: createdPatients.length },
      "Created test patients",
    );

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        count: createdPatients.length,
        patients: createdPatients,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    logger.error({ error }, "An error occurred while creating test patients");
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
