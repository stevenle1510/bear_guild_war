"use client";

import { cn } from "@/lib/utils";
import { FC, useEffect, useState } from "react";
import { Button } from "./ui/button";

const BackToTop: FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.pageYOffset > 300);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      aria-hidden={!visible}
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60 }}
    >
      <Button
        type="button"
        onClick={handleClick}
        aria-label="Back to top"
        title="Back to top"
        className={cn(
          "inline-flex items-center justify-center w-11 h-11 rounded-full border-none shadow-lg",
          !visible && "opacity-0 pointer-events-none"
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </Button>
    </div>
  );
};

export default BackToTop;
