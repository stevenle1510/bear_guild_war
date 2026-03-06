"use client";

import { Confirm } from "@/components/Confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  CLASS_TYPES,
  type ClassType,
  type Day,
  type Registration
} from "@/lib/api";
import { formatMergedSlotRangesFromEst, getUserTimeZone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { useGuildWarStore } from "@/stores/guildWarStore";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  LogOut,
  Plus,
  RotateCcw,
  Shield,
  Trash2
} from "lucide-react";
import Link from "next/link";
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

type ContainerId = "available" | `team-${number}`;

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
  mortalRopeDart: "Mortal Rope Dart"
};

const formatClass = (value: string) => {
  if ((CLASS_TYPES as readonly string[]).includes(value)) {
    return classLabel[value as ClassType];
  }
  return value;
};

const formatClassPair = (value: [string, string] | null) => {
  if (!value) return "";
  return `${formatClass(value[0])} / ${formatClass(value[1])}`;
};

const roleColor = (role: string) => {
  const key = role.toLowerCase();
  if (key.includes("heal")) return "bg-emerald-100 text-emerald-900";
  if (key.includes("tank") || key.includes("front"))
    return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-900";
};

function RegistrationCard({
  registration,
  containerId,
  canDrag,
  timeZone,
  onDelete,
  isDeleting
}: {
  registration: Registration;
  containerId: ContainerId;
  canDrag: boolean;
  timeZone: string;
  onDelete?: (registrationId: number) => Promise<void> | void;
  isDeleting?: boolean;
}) {
  const draggableId = `reg-${registration.id}`;
  const hasNote = Boolean(registration.note?.trim());
  const [mobileTooltipOpen, setMobileTooltipOpen] = useState(false);
  const isTouchDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: draggableId,
      disabled: !canDrag,
      data: {
        registrationId: registration.id,
        from: containerId
      }
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1
  };

  const displayRanges = useMemo(
    () =>
      formatMergedSlotRangesFromEst(
        registration.day,
        registration.timeSlots,
        timeZone
      ),
    [registration.day, registration.timeSlots, timeZone]
  );

  const cardContent = (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-background px-3 py-2 shadow-sm",
        canDrag ? "touch-none" : ""
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2">
        {canDrag && <GripVertical className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-sm font-medium">{registration.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatClassPair(registration.primaryClass)}
          </p>
          {registration.secondaryClass && (
            <p className="text-xs text-muted-foreground/70">
              {formatClassPair(registration.secondaryClass)}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">{displayRanges}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Badge className={roleColor(registration.primaryRole)}>
            {registration.primaryRole}
          </Badge>
          {registration.secondaryRole && (
            <Badge className={roleColor(registration.secondaryRole)}>
              {registration.secondaryRole}
            </Badge>
          )}
        </div>
        {onDelete ? (
          <Confirm
            title={`Delete registration for ${registration.name}?`}
            description="This action cannot be undone."
            confirmLabel={isDeleting ? "Deleting..." : "Delete"}
            onConfirm={async () => {
              await onDelete(registration.id);
            }}
            disabled={isDeleting}
          >
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              disabled={isDeleting}
              onPointerDown={event => event.stopPropagation()}
              onClick={event => event.stopPropagation()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Confirm>
        ) : null}
      </div>
    </div>
  );

  if (!hasNote) {
    return cardContent;
  }

  return (
    <Tooltip
      open={isTouchDevice ? mobileTooltipOpen : undefined}
      onOpenChange={setMobileTooltipOpen}
    >
      <TooltipTrigger
        asChild
        onClick={() => {
          if (!isTouchDevice || isDragging) return;
          setMobileTooltipOpen(prev => !prev);
        }}
      >
        {cardContent}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-sm whitespace-pre-wrap break-words"
      >
        {registration.note}
      </TooltipContent>
    </Tooltip>
  );
}

function DropZone({
  id,
  title,
  description,
  children,
  right
}: {
  id: ContainerId;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card className={cn(isOver ? "ring-2 ring-primary" : "")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          {right}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent ref={setNodeRef} className="space-y-2 min-h-20">
        {children}
      </CardContent>
    </Card>
  );
}

function DayBoard({ day, isAdmin }: { day: Day; isAdmin: boolean }) {
  const dayData = useGuildWarStore(state =>
    day === "Saturday" ? state.saturday : state.sunday
  );
  const adminToken = useGuildWarStore(state => state.adminToken);
  const loadDay = useGuildWarStore(state => state.loadDay);
  const assignRegistrationTeam = useGuildWarStore(
    state => state.assignRegistrationTeam
  );
  const createTeam = useGuildWarStore(state => state.createTeam);
  const updateTeam = useGuildWarStore(state => state.updateTeam);
  const deleteTeam = useGuildWarStore(state => state.deleteTeam);
  const deleteRegistration = useGuildWarStore(
    state => state.deleteRegistration
  );

  const [activeRegistrationId, setActiveRegistrationId] = useState<
    number | null
  >(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<
    number | null
  >(null);
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

  useEffect(() => {
    loadDay(day).catch(error => {
      toast.error(
        error instanceof Error ? error.message : "Failed to load data"
      );
    });
  }, [adminToken, day, loadDay]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8
      }
    })
  );

  const unassigned = useMemo(
    () => dayData.registrations.filter(item => item.teamId === null),
    [dayData.registrations]
  );

  const registrationById = useMemo(() => {
    const map = new Map<number, Registration>();
    dayData.registrations.forEach(item => map.set(item.id, item));
    return map;
  }, [dayData.registrations]);

  const activeRegistration = activeRegistrationId
    ? (registrationById.get(activeRegistrationId) ?? null)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const regId = Number(id.replace("reg-", ""));
    if (Number.isInteger(regId)) {
      setActiveRegistrationId(regId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveRegistrationId(null);

    if (!isAdmin) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const regId = Number(activeId.replace("reg-", ""));
    const from = active.data.current?.from as ContainerId | undefined;
    const to = String(over.id) as ContainerId;

    if (!Number.isInteger(regId) || !from || !to || from === to) return;

    const nextTeamId =
      to === "available" ? null : Number(to.replace("team-", ""));

    try {
      await assignRegistrationTeam({
        day,
        registrationId: regId,
        teamId: nextTeamId
      });
      toast.success("Assignment updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to move registration"
      );
    }
  };

  const handleCreateTeam = async () => {
    try {
      await createTeam({
        day,
        name: newTeamName.trim()
      });
      setNewTeamName("");
      setTeamPopoverOpen(false);
      toast.success("Team created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create team"
      );
    }
  };

  const handleDeleteRegistration = async (registrationId: number) => {
    if (!isAdmin) return;

    try {
      setDeletingRegistrationId(registrationId);
      await deleteRegistration({ day, registrationId });
      toast.success("Registration deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete registration"
      );
    } finally {
      setDeletingRegistrationId(null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 p-3 sm:p-6">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Time base: US EST ({EST_TIME_ZONE}) {estTime} ({estDate})
          </p>
          <p>
            Displayed in your local timezone: {localTimeZone} {localTime} (
            {localDate})
          </p>
        </div>
        {isAdmin && (
          <div className="flex justify-end">
            <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <PopoverHeader>
                  <PopoverTitle>Create Team</PopoverTitle>
                </PopoverHeader>
                <div className="space-y-2">
                  <Input
                    placeholder="Team name"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={handleCreateTeam}
                    disabled={!newTeamName.trim()}
                  >
                    Add Team
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {dayData.isLoading && <LoadingState />}
        {dayData.error && (
          <p className="text-sm text-destructive">{dayData.error}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="lg:col-span-1">
            <DropZone
              id="available"
              title="Unassigned"
              description={`${unassigned.length} registrations`}
            >
              {unassigned.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  No unassigned registrations
                </div>
              ) : (
                unassigned.map(item => (
                  <RegistrationCard
                    key={item.id}
                    registration={item}
                    containerId="available"
                    canDrag={isAdmin}
                    timeZone={localTimeZone}
                    onDelete={isAdmin ? handleDeleteRegistration : undefined}
                    isDeleting={deletingRegistrationId === item.id}
                  />
                ))
              )}
            </DropZone>
          </div>

          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {dayData.teams.map(team => {
                const dropId = `team-${team.id}` as ContainerId;
                const isEditingName = editingTeamId === team.id;

                return (
                  <DropZone
                    key={team.id}
                    id={dropId}
                    title={
                      isEditingName ? (
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Escape") {
                              setEditingTeamId(null);
                              setEditingName("");
                              return;
                            }

                            if (e.key !== "Enter") return;

                            const name = editingName.trim();
                            if (!name) return;

                            try {
                              await updateTeam(team.id, { day, name });
                              toast.success("Team updated");
                              setEditingTeamId(null);
                              setEditingName("");
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to update team"
                              );
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-left text-base sm:text-lg font-semibold hover:underline"
                          onClick={() => {
                            if (!isAdmin) return;
                            setEditingTeamId(team.id);
                            setEditingName(team.name);
                          }}
                        >
                          {team.name}
                        </button>
                      )
                    }
                    description={`Members: ${team.members.length}`}
                    right={
                      isAdmin ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await deleteTeam(day, team.id);
                              toast.success("Team deleted");
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to delete team"
                              );
                            }
                          }}
                        >
                          Delete
                        </Button>
                      ) : null
                    }
                  >
                    {team.members.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                        No members
                      </div>
                    ) : (
                      team.members.map(member => (
                        <RegistrationCard
                          key={member.id}
                          registration={member}
                          containerId={dropId}
                          canDrag={isAdmin}
                          timeZone={localTimeZone}
                          onDelete={
                            isAdmin ? handleDeleteRegistration : undefined
                          }
                          isDeleting={deletingRegistrationId === member.id}
                        />
                      ))
                    )}
                  </DropZone>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeRegistration ? (
          <div className="w-[280px]">
            <RegistrationCard
              registration={activeRegistration}
              containerId="available"
              canDrag={false}
              timeZone={localTimeZone}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default function GuildWarPage() {
  const [activeDay, setActiveDay] = useState<Day>("Saturday");
  const [isResetting, setIsResetting] = useState(false);

  const adminToken = useGuildWarStore(state => state.adminToken);
  const logout = useGuildWarStore(state => state.logout);
  const resetGuildWar = useGuildWarStore(state => state.resetGuildWar);

  const isAdmin = Boolean(adminToken);

  return (
    <main className="max-w-7xl lg:max-w-4/5 min-h-screen mx-auto py-6 lg:py-20 px-4 space-y-6 lg:space-y-10">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center sm:text-left">
          Guild War
        </h1>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/guild-war/register">Registration Form</Link>
          </Button>
          {!isAdmin ? (
            <Button asChild variant="default" size="sm">
              <Link href="/guild-war/login">Admin Login</Link>
            </Button>
          ) : null}
          {isAdmin ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </div>
              <Button variant="destructive" size="sm" onClick={() => logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs
        value={activeDay}
        onValueChange={value => setActiveDay(value as Day)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="Saturday">Saturday</TabsTrigger>
            <TabsTrigger value="Sunday">Sunday</TabsTrigger>
          </TabsList>
          {isAdmin ? (
            <Confirm
              title="Reset all guild war data?"
              description="This will remove all teams and registrations, and cannot be undone."
              confirmLabel={isResetting ? "Resetting..." : "Reset"}
              onConfirm={async () => {
                try {
                  setIsResetting(true);
                  await resetGuildWar();
                  toast.success("Guild war has been reset");
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Failed to reset guild war"
                  );
                } finally {
                  setIsResetting(false);
                }
              }}
              disabled={isResetting}
            >
              <Button variant="outline" size="sm" disabled={isResetting}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {isResetting ? "Resetting..." : "Reset"}
              </Button>
            </Confirm>
          ) : null}
        </div>

        {dayValues.map(day => (
          <TabsContent key={day} value={day} className="space-y-8">
            <DayBoard day={day} isAdmin={isAdmin} />
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
