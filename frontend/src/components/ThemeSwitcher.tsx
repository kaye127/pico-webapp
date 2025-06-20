import { useTheme } from "../hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import { Switch } from "./ui/switch";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-4 absolute top-5 right-5">
      <Sun className={`w-5 h-5 transition ${isDark ? "opacity-0" : "opacity-100"}`} />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        className="data-[state=checked]:bg-blue-600"
      />
      <Moon className={`w-5 h-5 transition ${isDark ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
