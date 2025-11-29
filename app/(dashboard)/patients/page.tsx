"use client";

import { useQuery } from "@tanstack/react-query";
import Container from "@/app/components/Container";
import { EditableCell } from "@/app/components/EditableCell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoaderCircle } from "lucide-react";
import type { Patient } from "@/app/models/patient";
import { formatPhone } from "@/lib/phone";

/**
 * Fetch patients from the API
 */
const fetchPatients = async (): Promise<Patient[]> => {
  const res = await fetch("/api/patients", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch patients: ${res.status}`);
  }

  return res.json();
};

/**
 * Format date to a readable string
 */
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Patients CRM page
 * Displays all patients for the authenticated practice in a table
 */
export default function Patients() {
  const {
    data: patients,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  return (
    <>
      <div className="flex">
        <h1 className="flex-1 text-3xl font-bold text-primary">Patients</h1>
      </div>

      <Container className="mt-6">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8">
            <LoaderCircle className="animate-spin" size={24} />
            <span className="text-sm text-subdued">Loading patients...</span>
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">
              Error loading patients. Please try again.
            </p>
          </div>
        )}

        {!isLoading && !error && patients && patients.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-subdued">
              No patients found. Add your first patient to get started.
            </p>
          </div>
        )}

        {!isLoading && !error && patients && patients.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    <EditableCell patient={patient} field="first_name" />
                  </TableCell>
                  <TableCell className="font-medium">
                    <EditableCell patient={patient} field="last_name" />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      patient={patient}
                      field="email"
                      type="email"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      patient={patient}
                      field="phone"
                      type="tel"
                      formatDisplay={(v) => formatPhone(v as string)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      patient={patient}
                      field="date_of_birth"
                      type="date"
                    />
                  </TableCell>
                  <TableCell className="text-subdued">
                    {formatDate(patient.registration_date)}
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      patient={patient}
                      field="status"
                      type="select"
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Container>
    </>
  );
}
