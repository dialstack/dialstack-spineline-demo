"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Container from "@/app/components/Container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LoaderCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Plus,
  Users,
} from "lucide-react";
import type { Patient } from "@/app/models/patient";
import { formatPhone } from "@/lib/phone";
import { PatientPanel } from "@/app/components/patients/PatientPanel";

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
 * Create a new patient
 */
const createPatient = async (data: Partial<Patient>): Promise<Patient> => {
  const res = await fetch("/api/patients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Failed to create patient: ${res.status}`);
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
 * Format status with proper capitalization
 */
const formatStatus = (status: string | undefined): string => {
  if (!status) return "Active";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

type SortColumn = "name" | "email" | "phone" | "dob" | "status" | null;
type SortDirection = "asc" | "desc";

/**
 * Patients CRM page
 * Displays all patients for the authenticated practice in a table
 * with a detail panel on the right when a patient is selected
 */
export default function Patients() {
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const {
    data: patients,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  // Derive selected patient from query data so it stays in sync
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId || !patients) return null;
    return patients.find((p) => p.id === selectedPatientId) || null;
  }, [selectedPatientId, patients]);

  // Create patient mutation
  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (createdPatient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setSelectedPatientId(createdPatient.id!);
    },
  });

  // Handle adding a new patient
  const handleAddPatient = () => {
    createMutation.mutate({
      first_name: "New",
      last_name: "Patient",
    });
  };

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    let result = patients.filter((patient) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const fullName =
        `${patient.first_name} ${patient.last_name}`.toLowerCase();
      const email = patient.email?.toLowerCase() || "";
      const phone = patient.phone || "";
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    });

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (sortColumn) {
          case "name":
            aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
            bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case "email":
            aVal = a.email?.toLowerCase() || "";
            bVal = b.email?.toLowerCase() || "";
            break;
          case "phone":
            aVal = a.phone || "";
            bVal = b.phone || "";
            break;
          case "dob":
            aVal = a.date_of_birth ? new Date(a.date_of_birth).getTime() : 0;
            bVal = b.date_of_birth ? new Date(b.date_of_birth).getTime() : 0;
            break;
          case "status":
            aVal = a.status || "active";
            bVal = b.status || "active";
            break;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [patients, searchQuery, sortColumn, sortDirection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape" && selectedPatientId) {
        setSelectedPatientId(null);
      }

      if (e.key === "ArrowDown" && filteredPatients.length > 0) {
        e.preventDefault();
        const currentIndex = filteredPatients.findIndex(
          (p) => p.id === selectedPatient?.id,
        );
        const nextPatient = filteredPatients[currentIndex + 1];
        if (nextPatient) {
          setSelectedPatientId(nextPatient.id!);
        } else if (currentIndex === -1) {
          setSelectedPatientId(filteredPatients[0].id!);
        }
      }

      if (e.key === "ArrowUp" && filteredPatients.length > 0) {
        e.preventDefault();
        const currentIndex = filteredPatients.findIndex(
          (p) => p.id === selectedPatient?.id,
        );
        const prevPatient = filteredPatients[currentIndex - 1];
        if (prevPatient) {
          setSelectedPatientId(prevPatient.id!);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPatient, selectedPatientId, filteredPatients]);

  // Render sort indicator
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <>
      <div
        className={`transition-all duration-300 ease-out ${
          selectedPatient ? "-translate-x-[190px]" : ""
        }`}
      >
        {/* Header with search and add button */}
        <div className="flex items-center gap-4">
          <h1 className="flex-1 text-3xl font-bold text-primary">Patients</h1>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              className="pl-9 bg-white dark:bg-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            onClick={handleAddPatient}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
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
            <div className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No patients yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first patient to get started.
              </p>
              <Button
                onClick={handleAddPatient}
                disabled={createMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Button>
            </div>
          )}

          {!isLoading &&
            !error &&
            patients &&
            patients.length > 0 &&
            filteredPatients.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No patients match your search.
                </p>
              </div>
            )}

          {!isLoading && !error && filteredPatients.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIndicator column="name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-1">
                      Email
                      <SortIndicator column="email" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center gap-1">
                      Phone
                      <SortIndicator column="phone" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("dob")}
                  >
                    <div className="flex items-center gap-1">
                      Date of Birth
                      <SortIndicator column="dob" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <SortIndicator column="status" />
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPatient?.id === patient.id
                        ? "bg-accent-subdued border-l-2 border-l-accent"
                        : "hover:bg-muted/50 border-l-2 border-l-transparent"
                    }`}
                    onClick={() => setSelectedPatientId(patient.id!)}
                  >
                    <TableCell className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.email || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.phone ? formatPhone(patient.phone) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(patient.date_of_birth)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          patient.status === "inactive"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-accent-subdued text-accent dark:bg-accent/20 dark:text-accent"
                        }`}
                      >
                        {formatStatus(patient.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Container>
      </div>

      {/* Patient details panel */}
      <PatientPanel
        patient={selectedPatient}
        onClose={() => setSelectedPatientId(null)}
      />
    </>
  );
}
