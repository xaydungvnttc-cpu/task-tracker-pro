import { createRoot } from "react-dom/client";
import { useEffect, type ComponentType } from "react";
import { AppProvider } from "@/components/app-provider";
import { Toasts } from "@/components/toasts";
import AppLayout from "@/app/(app)/layout";
import LoginPage from "@/app/login/page";
import DashboardPage from "@/app/(app)/dashboard/page";
import TodayPage from "@/app/(app)/today/page";
import TasksPage from "@/app/(app)/tasks/page";
import MatrixPage from "@/app/(app)/matrix/page";
import KanbanPage from "@/app/(app)/kanban/page";
import CalendarPage from "@/app/(app)/calendar/page";
import MembersPage from "@/app/(app)/members/page";
import SettingsPage from "@/app/(app)/settings/page";
import PortfolioPage from "@/app/(app)/portfolio/page";
import DirectivesPage from "@/app/(app)/directives/page";
import ProjectsPage from "@/app/(app)/projects/page";
import { usePathname } from "next/navigation";

const PAGES: Record<string, ComponentType> = {
  "/dashboard": DashboardPage,
  "/today": TodayPage,
  "/tasks": TasksPage,
  "/matrix": MatrixPage,
  "/kanban": KanbanPage,
  "/calendar": CalendarPage,
  "/members": MembersPage,
  "/settings": SettingsPage,
  "/portfolio": PortfolioPage,
  "/directives": DirectivesPage,
  "/projects": ProjectsPage,
};

function Router() {
  const path = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);
  if (path === "/login") return <LoginPage />;
  const Page = PAGES[path] ?? DashboardPage;
  return (
    <AppLayout>
      <Page />
    </AppLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <Router />
    <Toasts />
  </AppProvider>,
);
