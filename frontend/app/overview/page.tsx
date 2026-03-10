"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIME_SLOTS, type Day } from "@/lib/api";
import { getUserTimeZone } from "@/lib/timezone";
import { useGuildWarStore } from "@/stores/guildWarStore";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const dayValues: Day[] = ["Saturday", "Sunday"];
const EST_TIME_ZONE = "America/New_York";

const formatClock = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone
  }).format(date);

const formatDate = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone
  }).formatToParts(date);

  const year = parts.find(part => part.type === "year")?.value ?? "0000";
  const month = parts.find(part => part.type === "month")?.value ?? "00";
  const day = parts.find(part => part.type === "day")?.value ?? "00";

  return `${year}/${month}/${day}`;
};

export default function OverviewPage() {
  const [activeDay, setActiveDay] = useState<Day>("Saturday");
  const localTimeZone = useMemo(() => getUserTimeZone(), []);
  const [now, setNow] = useState(() => new Date());
  const estTime = useMemo(() => formatClock(now, EST_TIME_ZONE), [now]);
  const estDate = useMemo(() => formatDate(now, EST_TIME_ZONE), [now]);
  const localTime = useMemo(
    () => formatClock(now, localTimeZone),
    [now, localTimeZone]
  );
  const localDate = useMemo(
    () => formatDate(now, localTimeZone),
    [now, localTimeZone]
  );

  const loadAll = useGuildWarStore(state => state.loadAll);
  const saturday = useGuildWarStore(state => state.saturday);
  const sunday = useGuildWarStore(state => state.sunday);

  useEffect(() => {
    loadAll().catch(error => {
      toast.error(
        error instanceof Error ? error.message : "Failed to load overview"
      );
    });
  }, [loadAll]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 lg:py-20">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Availability and assignment matrix from backend registrations.
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Time base: US EST ({EST_TIME_ZONE}) {estTime} ({estDate})
          </p>
          <p>
            Displayed in your local timezone: {localTimeZone} {localTime} (
            {localDate})
          </p>
        </div>
      </section>

      <Tabs
        value={activeDay}
        onValueChange={value => setActiveDay(value as Day)}
      >
        <TabsList>
          {dayValues.map(day => (
            <TabsTrigger key={day} value={day}>
              {day}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="Saturday" className="pt-4">
          <DayOverview
            day="Saturday"
            registrations={saturday.registrations}
            teams={saturday.teams}
            isLoading={saturday.isLoading}
            error={saturday.error}
            timeZone={localTimeZone}
          />
        </TabsContent>
        <TabsContent value="Sunday" className="pt-4">
          <DayOverview
            day="Sunday"
            registrations={sunday.registrations}
            teams={sunday.teams}
            isLoading={sunday.isLoading}
            error={sunday.error}
            timeZone={localTimeZone}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function DayOverview({
  day,
  registrations,
  teams,
  isLoading,
  error,
  timeZone
}: {
  day: Day;
  registrations: ReturnType<
    typeof useGuildWarStore.getState
  >["saturday"]["registrations"];
  teams: ReturnType<typeof useGuildWarStore.getState>["saturday"]["teams"];
  isLoading: boolean;
  error: string | null;
  timeZone: string;
}) {
  const assignedCount = useMemo(
    () => registrations.filter(item => item.teamId !== null).length,
    [registrations]
  );
  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    teams.forEach(team => map.set(team.id, team.name));
    return map;
  }, [teams]);

  if (isLoading) return <LoadingState />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {day} ({registrations.length} registrations)
        </CardTitle>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary">Assigned: {assignedCount}</Badge>
          <Badge variant="outline">
            Unassigned: {registrations.length - assignedCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">P = Participating (not assigned)</Badge>
          <Badge variant="outline">A = Assigned to a team</Badge>
        </div>
        <table className="w-full min-w-225 border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-2 text-left">Name</th>
              <th className="border px-2 py-2 text-left">Primary Role</th>
              <th className="border px-2 py-2 text-left">Team</th>
              {TIME_SLOTS.map((slot, index) => (
                <th key={slot} className="border px-2 py-2 text-center text-xs">
                  Match {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registrations.map(item => (
              <tr key={item.id}>
                <td className="border px-2 py-2">{item.name}</td>
                <td className="border px-2 py-2">
                  {item.primaryRole.toUpperCase()}
                </td>
                <td className="border px-2 py-2">
                  {item.teamId
                    ? (teamNameById.get(item.teamId) ?? `#${item.teamId}`)
                    : "-"}
                </td>
                {TIME_SLOTS.map(slot => {
                  const hasSlot = item.timeSlots.includes(slot);
                  const cellClassName = !hasSlot
                    ? "bg-muted/40"
                    : item.teamId
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
                  return (
                    <td
                      key={`${item.id}-${slot}`}
                      className={`border px-2 py-2 text-center ${cellClassName}`}
                    >
                      {hasSlot ? (item.teamId ? "A" : "P") : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
