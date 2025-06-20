import { createBrowserRouter } from "react-router-dom";
import AppFallback from "./components/AppFallback.tsx";
import Index from "./pages/Index";
import Client from "./pages/Client";
import Admin from "./pages/Admin";
import Layout from "./components/Layout.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout/>,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: ":topic",
        element: <Client />,
      },
      {
        path: "/admin",
        element: <Admin />,
      },
    ],
  },

  {
    path: "*",
    element: <AppFallback />,
  },
]);

export default router;
