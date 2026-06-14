import client from "./client";
import type { Currency, Person, Summary, Transaction, User } from "../types";

export const api = {
  auth: {
    register: () => client.post<User>("/auth/register"),
    me: () => client.get<User>("/auth/me"),
  },

  persons: {
    list: (archived = false) =>
      client.get<Person[]>("/persons", { params: { archived } }),
    get: (id: number) => client.get<Person>(`/persons/${id}`),
    create: (data: { name: string; currencies: string[] }) =>
      client.post<Person>("/persons", data),
    update: (id: number, data: { name?: string; currencies?: string[] }) =>
      client.put<Person>(`/persons/${id}`, data),
    delete: (id: number) => client.delete(`/persons/${id}`),
    archive: (id: number) => client.post<Person>(`/persons/${id}/archive`),
    setReminder: (id: number, reminder_at: string) =>
      client.post<Person>(`/persons/${id}/reminder`, { reminder_at }),
    cancelReminder: (id: number) =>
      client.delete<Person>(`/persons/${id}/reminder`),
  },

  transactions: {
    create: (
      personId: number,
      data: {
        type: "lend" | "borrow";
        amount: number;
        currency: string;
        note?: string;
        date: string;
        parent_id?: number;
      }
    ) => client.post<Transaction>(`/persons/${personId}/transactions`, data),
    update: (
      id: number,
      data: { amount?: number; currency?: string; note?: string; date?: string }
    ) => client.put<Transaction>(`/transactions/${id}`, data),
    delete: (id: number) => client.delete(`/transactions/${id}`),
  },

  summary: {
    get: () => client.get<Summary>("/summary"),
  },

  currencies: {
    list: () => client.get<Currency[]>("/currencies"),
  },

  export: {
    debtsCSV: () =>
      client.get("/export/debts", { responseType: "blob" }),
    personPDF: (personId: number) =>
      client.get(`/export/persons/${personId}/pdf`, { responseType: "blob" }),
  },

  import: {
    preview: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return client.post<{
        column_mapping: Record<string, string>;
        detected_headers: string[];
        sample_rows: Record<string, string>[];
        total_rows: number;
        errors: string[];
      }>("/import/debts/preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    confirm: (fileB64: string, columnMapping: Record<string, string>) =>
      client.post<{
        created_persons: number;
        created_transactions: number;
        errors: string[];
      }>("/import/debts/confirm", {
        file_b64: fileB64,
        column_mapping: columnMapping,
      }),
  },
};
