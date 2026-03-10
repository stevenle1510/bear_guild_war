"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CLASS_TYPES,
  TIME_SLOTS,
  type ClassType,
  type Day,
  type TimeSlot
} from "@/lib/api";
import { getUserTimeZone } from "@/lib/timezone";
import { useGuildWarStore } from "@/stores/guildWarStore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type DayParticipation = {
  enabled: boolean;
  slots: TimeSlot[];
};

const classLabel: Record<ClassType, string> = {
  strategicSword: "Strategic Sword",
  heavenquakerSpear: "Heavenquaker Spear",
  namelessSword: "Nameless Sword",
  namelessSpear: "Nameless Spear",
  vernalUmbrella: "Vernal Umbrella",
  inkwellFan: "Inkwell Fan",
  soulshadeUmbrella: "Soulshade Umbrella",
  panaceaFan: "Panacea Fan",
  thundercryBlade: "Thundercry Blade",
  stormreakerSpear: "Stormreaker Spear",
  infernalTwinblades: "Infernal Twinblades",
  mortalRopeDart: "Mortal Rope Dart",
  everspringUmbrella: "Everspring Umbrella",
  unFetteredRopeDart: "Unfettered Rope Dart"
};

const ROLE_OPTIONS = ["dps", "healer", "tank"] as const;
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

export default function RegisterPage() {
  const createRegistration = useGuildWarStore(
    state => state.createRegistration
  );

  const [name, setName] = useState("");
  const [primaryClass1, setPrimaryClass1] =
    useState<ClassType>("strategicSword");
  const [primaryClass2, setPrimaryClass2] =
    useState<ClassType>("heavenquakerSpear");
  const [secondaryClass1, setSecondaryClass1] = useState<string>("none");
  const [secondaryClass2, setSecondaryClass2] = useState<string>("none");
  const [primaryRole, setPrimaryRole] =
    useState<(typeof ROLE_OPTIONS)[number]>("dps");
  const [secondaryRole, setSecondaryRole] = useState<string>("none");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const localTimeZone = useMemo(() => getUserTimeZone(), []);
  const [now, setNow] = useState(() => new Date());
  const canSelectSecondaryRole =
    secondaryClass1 !== "none" && secondaryClass2 !== "none";

  const [saturday, setSaturday] = useState<DayParticipation>({
    enabled: true,
    slots: []
  });
  const [sunday, setSunday] = useState<DayParticipation>({
    enabled: false,
    slots: []
  });

  const participations = useMemo(() => {
    const data: Array<{ day: Day; time_slots: TimeSlot[] }> = [];
    if (saturday.enabled && saturday.slots.length > 0)
      data.push({ day: "Saturday", time_slots: saturday.slots });
    if (sunday.enabled && sunday.slots.length > 0)
      data.push({ day: "Sunday", time_slots: sunday.slots });
    return data;
  }, [saturday, sunday]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canSelectSecondaryRole && secondaryRole !== "none") {
      setSecondaryRole("none");
    }
  }, [canSelectSecondaryRole, secondaryRole]);

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

  const toggleSlot = (day: Day, slot: TimeSlot, checked: boolean) => {
    const setter = day === "Saturday" ? setSaturday : setSunday;
    setter(prev => ({
      ...prev,
      slots: checked
        ? [...prev.slots, slot]
        : prev.slots.filter(item => item !== slot)
    }));
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (participations.length === 0) {
      toast.error("Select at least one day with time slots");
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryClass: [ClassType, ClassType] = [
        primaryClass1,
        primaryClass2
      ];
      const hasSecondary1 = secondaryClass1 !== "none";
      const hasSecondary2 = secondaryClass2 !== "none";

      if (hasSecondary1 !== hasSecondary2) {
        toast.error(
          "Please select both secondary class values or leave both as None"
        );
        return;
      }

      const secondaryClass =
        hasSecondary1 && hasSecondary2
          ? ([secondaryClass1 as ClassType, secondaryClass2 as ClassType] as [
              ClassType,
              ClassType
            ])
          : undefined;

      await createRegistration({
        name: name.trim(),
        role: primaryRole,
        primaryClass,
        secondaryClass,
        primary_role: primaryRole,
        secondary_role: secondaryRole === "none" ? undefined : secondaryRole,
        note: note.trim() || undefined,
        participations
      });

      setName("");
      setPrimaryClass1("strategicSword");
      setPrimaryClass2("heavenquakerSpear");
      setSecondaryClass1("none");
      setSecondaryClass2("none");
      setPrimaryRole("dps");
      setSecondaryRole("none");
      setNote("");
      setSaturday({ enabled: true, slots: [] });
      setSunday({ enabled: false, slots: [] });
      toast.success("Registration submitted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit registration"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:py-20">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Guild War Registration</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/guild-war">Back to Guild War</Link>
        </Button>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Time base: US EST ({EST_TIME_ZONE}) {estTime} ({estDate})
        </p>
        <p>
          Displayed in your local timezone: {localTimeZone} {localTime} (
          {localDate})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Player name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Class 1</Label>
              <Select
                value={primaryClass1}
                onValueChange={value => setPrimaryClass1(value as ClassType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPES.map(item => (
                    <SelectItem key={item} value={item}>
                      {classLabel[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary Class 2</Label>
              <Select
                value={primaryClass2}
                onValueChange={value => setPrimaryClass2(value as ClassType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPES.map(item => (
                    <SelectItem key={item} value={item}>
                      {classLabel[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Secondary Class 1</Label>
              <Select
                value={secondaryClass1}
                onValueChange={setSecondaryClass1}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CLASS_TYPES.map(item => (
                    <SelectItem key={item} value={item}>
                      {classLabel[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Secondary Class 2</Label>
              <Select
                value={secondaryClass2}
                onValueChange={setSecondaryClass2}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CLASS_TYPES.map(item => (
                    <SelectItem key={item} value={item}>
                      {classLabel[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Role</Label>
              <Select
                value={primaryRole}
                onValueChange={value =>
                  setPrimaryRole(value as (typeof ROLE_OPTIONS)[number])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Secondary Role</Label>
              <Select
                value={secondaryRole}
                onValueChange={setSecondaryRole}
                disabled={!canSelectSecondaryRole}
              >
                <SelectTrigger
                  className="w-full"
                  disabled={!canSelectSecondaryRole}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Optional note"
              rows={3}
            />
          </div>

          {(["Saturday", "Sunday"] as Day[]).map(day => {
            const state = day === "Saturday" ? saturday : sunday;
            const setState = day === "Saturday" ? setSaturday : setSunday;

            return (
              <div key={day} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={state.enabled}
                    onCheckedChange={value =>
                      setState(prev => ({ ...prev, enabled: Boolean(value) }))
                    }
                  />
                  <Label htmlFor={`day-${day}`}>{day}</Label>
                </div>
                {state.enabled && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TIME_SLOTS.map((slot, index) => {
                      const checked = state.slots.includes(slot);
                      return (
                        <label
                          key={`${day}-${slot}`}
                          className="flex items-center gap-2 rounded border p-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={value =>
                              toggleSlot(day, slot, Boolean(value))
                            }
                          />
                          <span>Match {index + 1}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
