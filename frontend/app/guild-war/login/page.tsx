"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGuildWarStore } from "@/stores/guildWarStore";
import { Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function GuildWarLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const login = useGuildWarStore(state => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login(username.trim(), password);
      toast.success("Logged in as admin");
      router.replace("/guild-war");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl min-h-screen px-4 py-6 lg:py-20">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Guild War Admin Login
          </CardTitle>
          <CardDescription>
            Login to enable drag-and-drop assignment and team management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-between gap-2">
            <Button asChild variant="outline">
              <Link href="/guild-war">Back to Guild War</Link>
            </Button>
            <Button
              onClick={handleLogin}
              disabled={!username.trim() || !password || isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
