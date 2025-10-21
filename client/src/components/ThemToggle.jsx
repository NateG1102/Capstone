import { useEffect, useState } from "react";

/**
 * Minimal theme toggle:
 * - Persists choice in localStorage ("theme" = "light" | "dark")
 * - Applies class to <body> so your global.css takes over
 */
export default function ThemeToggle({ compact = false }) {
  const [isLight, setIsLight] = useState(() => {
    // default from localStorage; “dark” for anything else
    return (localStorage.getItem("theme") || "").toLowerCase() === "light";
  });

  useEffect(() => {
    document.body.classList.toggle("light", isLight);
    localStorage.setItem("theme", isLight ? "light" : "dark");
  }, [isLight]);

  return (
    <button
      className="segbtn"
      onClick={() => setIsLight(v => !v)}
      aria-label="Toggle theme"
      title="Toggle theme"
      style={compact ? { padding: "6px 10px" } : undefined}
    >
      {isLight ? "🌞 Light" : "🌙 Dark"}
    </button>
  );
}
