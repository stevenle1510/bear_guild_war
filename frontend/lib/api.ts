const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8787";

export type Day = "Saturday" | "Sunday";

export const TIME_SLOTS = [
  "20:30-21:00",
  "21:00-21:30",
  "21:30-22:00",
  "22:00-22:30",
  "22:30-23:00"
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export const CLASS_TYPES = [
  "strategicSword",
  "heavenquakerSpear",
  "namelessSword",
  "namelessSpear",
  "vernalUmbrella",
  "inkwellFan",
  "soulshadeUmbrella",
  "panaceaFan",
  "thundercryBlade",
  "stormreakerSpear",
  "infernalTwinblades",
  "mortalRopeDart"
] as const;

export type ClassType = (typeof CLASS_TYPES)[number];

export type Registration = {
  id: number;
  name: string;
  role: string;
  primaryClass: [ClassType, ClassType];
  secondaryClass: [ClassType, ClassType] | null;
  primaryRole: string;
  secondaryRole: string | null;
  note: string | null;
  timeSlot: TimeSlot;
  timeSlots: TimeSlot[];
  day: Day;
  teamId: number | null;
  createdAt: number;
};

export type Team = {
  id: number;
  name: string;
  day: Day;
  createdAt: number;
  members: Registration[];
};

export type AdminLoginResponse = {
  token: string;
  tokenType: "Bearer";
  expiresAt: number;
};

export type CreateRegistrationPayload = {
  name: string;
  role: "dps" | "healer" | "tank";
  primaryClass: [ClassType, ClassType];
  secondaryClass?: [ClassType, ClassType];
  primary_role: string;
  secondary_role?: string;
  note?: string;
  participations: Array<{
    day: Day;
    time_slots: TimeSlot[];
  }>;
};

type ApiError = {
  error?: string;
  message?: string;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string | null
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const raw = await response.text();
    let data: T | ApiError | null = null;

    if (raw) {
      try {
        data = JSON.parse(raw) as T | ApiError;
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const err = (data ?? {}) as ApiError;
      throw new Error(
        err.error ||
          err.message ||
          `HTTP ${response.status} ${response.statusText} at ${endpoint}`
      );
    }

    if (data === null) {
      throw new Error(`Invalid JSON response at ${endpoint}`);
    }

    return data as T;
  }

  health() {
    return this.request<{ status: string }>("/");
  }

  createRegistration(payload: CreateRegistrationPayload) {
    return this.request<{ ids: number[]; message: string }>("/registrations", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  publicListRegistrations(params?: {
    day?: Day;
    assignment?: "all" | "assigned" | "unassigned";
  }) {
    const search = new URLSearchParams();
    if (params?.day) search.set("day", params.day);
    if (params?.assignment) search.set("assignment", params.assignment);
    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    return this.request<{ data: Registration[] }>(`/registrations${suffix}`);
  }

  publicListTeams(day: Day) {
    const search = new URLSearchParams({ day });
    return this.request<{ day: Day; teams: Team[] }>(
      `/teams?${search.toString()}`
    );
  }

  adminLogin(username: string, password: string) {
    return this.request<AdminLoginResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  }

  adminLogout(token: string) {
    return this.request<{ success: boolean }>(
      "/admin/logout",
      {
        method: "POST"
      },
      token
    );
  }

  adminListRegistrations(
    token: string,
    params?: { day?: Day; assignment?: "all" | "assigned" | "unassigned" }
  ) {
    const search = new URLSearchParams();
    if (params?.day) search.set("day", params.day);
    if (params?.assignment) search.set("assignment", params.assignment);
    const suffix = search.size > 0 ? `?${search.toString()}` : "";

    return this.request<{ data: Registration[] }>(
      `/admin/registrations${suffix}`,
      {},
      token
    );
  }

  adminListTeams(token: string, day: Day) {
    const search = new URLSearchParams({ day });
    return this.request<{ day: Day; teams: Team[] }>(
      `/admin/teams?${search.toString()}`,
      {},
      token
    );
  }

  adminCreateTeam(token: string, payload: { day: Day; name: string }) {
    return this.request<{ team: Team }>(
      "/admin/teams",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    );
  }

  adminUpdateTeam(token: string, teamId: number, payload: { name?: string }) {
    return this.request<{ team: Team }>(
      `/admin/teams/${teamId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      token
    );
  }

  adminDeleteTeam(token: string, teamId: number) {
    return this.request<{ success: boolean }>(
      `/admin/teams/${teamId}`,
      {
        method: "DELETE"
      },
      token
    );
  }

  adminAssignRegistrationTeam(
    token: string,
    registrationId: number,
    teamId: number | null
  ) {
    return this.request<{ success: boolean }>(
      `/admin/registrations/${registrationId}/team`,
      {
        method: "PATCH",
        body: JSON.stringify({ teamId })
      },
      token
    );
  }

  adminResetGuildWar(token: string) {
    return this.request<{ success?: boolean; message?: string }>(
      "/admin/guild-war/reset",
      {
        method: "POST"
      },
      token
    );
  }
}

export const api = new ApiClient(API_BASE_URL);
