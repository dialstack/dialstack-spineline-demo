"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { LoaderCircle, X } from "lucide-react";
import type { Patient } from "@/app/models/patient";

type EditableCellProps = {
  patient: Patient;
  field: keyof Patient;
  type?: "text" | "email" | "date" | "tel" | "select";
  options?: { value: string; label: string }[];
  /** Format raw value for display (when not editing) */
  formatDisplay?: (value: unknown) => string;
  /** Format raw value for editing (defaults to formatDisplay if not provided) */
  formatInput?: (value: unknown) => string;
  /** Format value as user types (e.g., phone formatting) */
  formatOnChange?: (value: string) => string;
  /** Parse edited value before saving (e.g., convert to E.164) */
  parseValue?: (value: string) => unknown;
  className?: string;
};

/**
 * Update a patient field via the API
 */
async function updatePatient(
  patientId: number,
  field: string,
  value: unknown,
): Promise<Patient> {
  const res = await fetch(`/api/patients/${patientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: value }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update: ${res.status}`);
  }

  return res.json();
}

/**
 * Editable table cell component
 * Click to edit, blur or Enter to save, Escape to cancel
 */
export function EditableCell({
  patient,
  field,
  type = "text",
  options,
  formatDisplay,
  formatInput,
  formatOnChange,
  parseValue,
  className = "",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState<string>("");
  const [error, setError] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLSelectElement>(null);
  const queryClient = useQueryClient();

  // Get raw value from patient
  const rawValue = patient[field];

  // Format value for display
  const displayValue = React.useMemo(() => {
    if (formatDisplay) {
      return formatDisplay(rawValue);
    }
    if (rawValue === null || rawValue === undefined) {
      return "—";
    }
    if (type === "date" && rawValue) {
      const d = new Date(rawValue as string);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return String(rawValue);
  }, [rawValue, formatDisplay, type]);

  // Format value for input (what user edits)
  const inputValue = React.useMemo(() => {
    if (rawValue === null || rawValue === undefined) {
      return "";
    }
    if (formatInput) {
      const formatted = formatInput(rawValue);
      return formatted === "—" ? "" : formatted;
    }
    if (formatDisplay && type === "tel") {
      // For phone fields, use display format for editing too
      const formatted = formatDisplay(rawValue);
      return formatted === "—" ? "" : formatted;
    }
    if (type === "date" && rawValue) {
      // Format as YYYY-MM-DD for date input
      const d = new Date(rawValue as string);
      return d.toISOString().split("T")[0];
    }
    return String(rawValue);
  }, [rawValue, type, formatInput, formatDisplay]);

  // Mutation for saving
  const mutation = useMutation({
    mutationFn: (newValue: unknown) =>
      updatePatient(patient.id!, String(field), newValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsEditing(false);
      setError(false);
    },
    onError: () => {
      setError(true);
      // Keep editing mode open on error
    },
  });

  // Enter edit mode
  const handleClick = () => {
    if (mutation.isPending) return;
    setValue(inputValue);
    setIsEditing(true);
    setError(false);
  };

  // Save on blur or Enter
  const handleSave = () => {
    // Parse the value appropriately
    let parsedValue: unknown = value;

    if (type === "date") {
      parsedValue = value || null;
    } else if (value === "") {
      parsedValue = null;
    } else if (parseValue) {
      // Use custom parser (e.g., for phone numbers to E.164)
      parsedValue = parseValue(value);
      // If parser returned null but input wasn't empty, it's invalid
      if (parsedValue === null) {
        setError(true);
        return;
      }
    }

    // Only save if value changed
    if (parsedValue !== rawValue && !(parsedValue === null && !rawValue)) {
      mutation.mutate(parsedValue);
    } else {
      setIsEditing(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setError(false);
    setValue(inputValue);
  };

  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Show loading state
  if (mutation.isPending) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <LoaderCircle className="size-3 animate-spin text-subdued" />
        <span className="text-subdued">{displayValue}</span>
      </div>
    );
  }

  // Edit mode
  if (isEditing) {
    if (type === "select" && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`h-8 rounded border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
            error ? "border-destructive" : "border-input"
          } ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = formatOnChange
        ? formatOnChange(e.target.value)
        : e.target.value;
      setValue(newValue);
    };

    return (
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === "tel" ? "text" : type}
        value={value}
        onChange={handleChange}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`h-8 px-2 text-sm ${error ? "border-destructive" : ""} ${className}`}
      />
    );
  }

  // Display mode - clickable to edit
  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer rounded px-1 py-0.5 hover:bg-muted ${className}`}
      title="Click to edit"
    >
      {error && (
        <span className="mr-1 text-destructive">
          <X className="inline size-3" />
        </span>
      )}
      {displayValue}
    </div>
  );
}
