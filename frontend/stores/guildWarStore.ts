"use client";

import { api, type Day, type Registration, type Team } from "@/lib/api";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type DayData = {
  registrations: Registration[];
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
};

type GuildWarState = {
  adminToken: string | null;
  adminTokenExpiresAt: number | null;
  saturday: DayData;
  sunday: DayData;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadDay: (day: Day, options?: { forceRefresh?: boolean }) => Promise<void>;
  loadAll: () => Promise<void>;

  createTeam: (payload: { day: Day; name: string }) => Promise<void>;
  updateTeam: (teamId: number, payload: { day: Day; name?: string }) => Promise<void>;
  deleteTeam: (day: Day, teamId: number) => Promise<void>;
  assignRegistrationTeam: (payload: { day: Day; registrationId: number; teamId: number | null }) => Promise<void>;
  deleteRegistration: (payload: { day: Day; registrationId: number }) => Promise<void>;
  resetGuildWar: () => Promise<void>;
  createRegistration: (payload: Parameters<typeof api.createRegistration>[0]) => Promise<void>;
};

const initialDayData: DayData = {
  registrations: [],
  teams: [],
  isLoading: false,
  error: null,
  lastFetched: null
};

const dayKey = (day: Day) => (day === "Saturday" ? "saturday" : "sunday");
const CACHE_DURATION_MS = 3 * 60 * 1000;

export const useGuildWarStore = create<GuildWarState>()(
  persist(
    (set, get) => ({
      adminToken: null,
      adminTokenExpiresAt: null,
      saturday: { ...initialDayData },
      sunday: { ...initialDayData },

      login: async (username, password) => {
        const response = await api.adminLogin(username, password);
        set({
          adminToken: response.token,
          adminTokenExpiresAt: response.expiresAt
        });
      },

      logout: async () => {
        const token = get().adminToken;
        if (token) {
          try {
            await api.adminLogout(token);
          } catch {
            // Ignore logout errors and clear local state.
          }
        }

        set({
          adminToken: null,
          adminTokenExpiresAt: null,
          saturday: { ...initialDayData },
          sunday: { ...initialDayData }
        });
      },

      loadDay: async (day, options) => {
        const token = get().adminToken;
        const key = dayKey(day);
        const current = get()[key];
        const now = Date.now();
        const forceRefresh = options?.forceRefresh ?? false;

        if (current.isLoading && !forceRefresh) {
          return;
        }

        if (
          !forceRefresh &&
          current.lastFetched !== null &&
          now - current.lastFetched < CACHE_DURATION_MS
        ) {
          return;
        }

        set(state => ({
          [key]: {
            ...state[key],
            isLoading: true,
            error: null
          }
        }));

        try {
          let registrationsResponse: { data: Registration[] };
          let teamsResponse: { day: Day; teams: Team[] };

          if (token) {
            try {
              [registrationsResponse, teamsResponse] = await Promise.all([
                api.adminListRegistrations(token, { day, assignment: "all" }),
                api.adminListTeams(token, day)
              ]);
            } catch {
              // Expired/invalid token should not block public reads.
              set({ adminToken: null, adminTokenExpiresAt: null });
              [registrationsResponse, teamsResponse] = await Promise.all([
                api.publicListRegistrations({ day, assignment: "all" }),
                api.publicListTeams(day)
              ]);
            }
          } else {
            [registrationsResponse, teamsResponse] = await Promise.all([
              api.publicListRegistrations({ day, assignment: "all" }),
              api.publicListTeams(day)
            ]);
          }

          set({
            [key]: {
              registrations: registrationsResponse.data,
              teams: teamsResponse.teams,
              isLoading: false,
              error: null,
              lastFetched: Date.now()
            }
          });
        } catch (error) {
          set(state => ({
            [key]: {
              ...state[key],
              isLoading: false,
              error: error instanceof Error ? error.message : "Failed to load data",
              lastFetched: null
            }
          }));
          throw error;
        }
      },

      loadAll: async () => {
        await Promise.all([get().loadDay("Saturday"), get().loadDay("Sunday")]);
      },

      createTeam: async payload => {
        const token = get().adminToken;
        if (!token) throw new Error("Admin token is required");

        await api.adminCreateTeam(token, payload);
        set(state => ({
          [dayKey(payload.day)]: {
            ...state[dayKey(payload.day)],
            lastFetched: null
          }
        }));
        await get().loadDay(payload.day, { forceRefresh: true });
      },

      updateTeam: async (teamId, payload) => {
        const token = get().adminToken;
        if (!token) throw new Error("Admin token is required");

        const updatePayload: { name?: string } = {};
        if (payload.name !== undefined) updatePayload.name = payload.name;

        await api.adminUpdateTeam(token, teamId, updatePayload);
        set(state => ({
          [dayKey(payload.day)]: {
            ...state[dayKey(payload.day)],
            lastFetched: null
          }
        }));
        await get().loadDay(payload.day, { forceRefresh: true });
      },

      deleteTeam: async (day, teamId) => {
        const token = get().adminToken;
        if (!token) throw new Error("Admin token is required");

        await api.adminDeleteTeam(token, teamId);
        set(state => ({
          [dayKey(day)]: {
            ...state[dayKey(day)],
            lastFetched: null
          }
        }));
        await get().loadDay(day, { forceRefresh: true });
      },

      assignRegistrationTeam: async ({ day, registrationId, teamId }) => {
        const token = get().adminToken;
        if (!token) throw new Error("Admin token is required");

        await api.adminAssignRegistrationTeam(token, registrationId, teamId);
        set(state => ({
          [dayKey(day)]: {
            ...state[dayKey(day)],
            lastFetched: null
          }
        }));
        await get().loadDay(day, { forceRefresh: true });
      },

      deleteRegistration: async ({ day, registrationId }) => {
        const token = get().adminToken;
        if (!token) throw new Error("Admin token is required");

        await api.adminDeleteRegistration(token, registrationId);
        set(state => ({
          [dayKey(day)]: {
            ...state[dayKey(day)],
            lastFetched: null
          }
        }));
        await get().loadDay(day, { forceRefresh: true });
      },

      resetGuildWar: async () => {
        const token = get().adminToken;
        if (!token) throw new Error("Admin token is required");

        await api.adminResetGuildWar(token);

        set(state => ({
          saturday: { ...state.saturday, lastFetched: null },
          sunday: { ...state.sunday, lastFetched: null }
        }));

        await Promise.all([
          get().loadDay("Saturday", { forceRefresh: true }),
          get().loadDay("Sunday", { forceRefresh: true })
        ]);
      },

      createRegistration: async payload => {
        await api.createRegistration(payload);
        const changedDays = Array.from(
          new Set(payload.participations.map(item => item.day))
        );

        set(state => {
          const nextState: Partial<GuildWarState> = {};
          for (const day of changedDays) {
            const key = dayKey(day);
            nextState[key] = {
              ...state[key],
              lastFetched: null
            };
          }
          return nextState;
        });

        await Promise.all(
          changedDays.map(day => get().loadDay(day, { forceRefresh: true }))
        );
      }
    }),
    {
      name: "guild-war-state",
      partialize: state => ({
        adminToken: state.adminToken,
        adminTokenExpiresAt: state.adminTokenExpiresAt
      })
    }
  )
);
