import { Outlet} from "react-router-dom";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Layout() {
  return (
      <main className="p-4">
        <ThemeSwitcher/>
        <Outlet />
      </main>
  );
}
