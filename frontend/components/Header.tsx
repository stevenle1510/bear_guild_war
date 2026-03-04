"use client";

import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedThemeToggler } from "./AnimatedThemeToggler";

const menuItems = [
  { name: "Guild War", href: "/guild-war" },
  { name: "Overview", href: "/overview" }
] as const;

const Header = () => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-7xl rounded-2xl border border-transparent px-6 transition-all duration-300 lg:px-8",
            isScrolled &&
              "max-w-5xl border border-border bg-background/70 backdrop-blur"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/guild-war"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <span className="font-bold text-primary-foreground">BG</span>
                </div>
                <h1 className="text-xl font-bold sm:text-2xl">Bear Guild</h1>
              </Link>

              <div className="flex items-center gap-4">
                <AnimatedThemeToggler className="block lg:hidden" />
                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState ? "Close Menu" : "Open Menu"}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                >
                  <Menu className="m-auto size-6 duration-200 in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0" />
                  <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100" />
                </button>
              </div>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground transition hover:text-foreground"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border bg-background p-6 shadow-2xl shadow-zinc-300/20 in-data-[state=active]:block md:flex-nowrap lg:in-data-[state=active]:flex lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map(item => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block text-center text-muted-foreground transition hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <AnimatedThemeToggler className="hidden lg:block" />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
