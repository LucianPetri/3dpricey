/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Printer,
  Package,
  Users,
  Building2,
  UserCircle,
  FileCode,
  Hammer,
  Recycle,
  Settings2,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import MaterialsManager from "@/components/settings/MaterialsManager";

import MachinesManager from "@/components/settings/MachinesManager";
import ConstantsManager from "@/components/settings/ConstantsManager";
import SettingsExportImport from "@/components/settings/SettingsExportImport";
import SettingsCRM from "@/components/settings/SettingsCRM";
import SettingsEmployee from "@/components/settings/SettingsEmployee";
import SettingsLabor from "@/components/settings/SettingsLabor";
import RecyclableManager from "@/components/settings/RecyclableManager";
import CompanySettings from "@/components/settings/CompanySettings";
import GcodeManager from "@/components/settings/GcodeManager";
import { useSearchParams, Link } from "react-router-dom";
import { CurrencySelector } from "@/components/shared/CurrencySelector";
import { Button } from "@/components/ui/button";

type SettingsTab =
  | "materials"
  | "machines"
  | "constants"
  | "gcodes"
  | "customers"
  | "employees"
  | "labor"
  | "recyclable"
  | "company";

type SettingsSection = {
  value: SettingsTab;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "Print Setup" | "Business" | "Workspace";
};

const settingsSections: SettingsSection[] = [
  {
    value: "materials",
    label: "Materials",
    description: "Manage filament and resin profiles for accurate cost calculations.",
    icon: Package,
    group: "Print Setup",
  },
  {
    value: "machines",
    label: "Machines",
    description: "Configure printer capabilities, defaults, and hourly machine costs.",
    icon: Printer,
    group: "Print Setup",
  },
  {
    value: "constants",
    label: "Consumables",
    description: "Set pricing constants, electricity rates, and recurring overhead inputs.",
    icon: Database,
    group: "Print Setup",
  },
  {
    value: "gcodes",
    label: "Saved Projects",
    description: "Review and manage saved print project files and parsed metadata.",
    icon: FileCode,
    group: "Print Setup",
  },
  {
    value: "customers",
    label: "Customers",
    description: "Maintain customer records for repeat quotes and delivery details.",
    icon: Users,
    group: "Business",
  },
  {
    value: "employees",
    label: "Employees",
    description: "Track employee profiles used in production and labor assignments.",
    icon: UserCircle,
    group: "Business",
  },
  {
    value: "labor",
    label: "Labor",
    description: "Define labor rates and role-based pricing for print operations.",
    icon: Hammer,
    group: "Business",
  },
  {
    value: "recyclable",
    label: "Recyclable",
    description: "Configure recyclable material flows and recovery value assumptions.",
    icon: Recycle,
    group: "Workspace",
  },
  {
    value: "company",
    label: "Company",
    description: "Manage company profile details used in exported documents and invoices.",
    icon: Building2,
    group: "Workspace",
  },
];

const sectionGroups: SettingsSection["group"][] = ["Print Setup", "Business", "Workspace"];

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const currentTab: SettingsTab = settingsSections.some((section) => section.value === tabFromUrl)
    ? (tabFromUrl as SettingsTab)
    : "materials";
  const currentSection = settingsSections.find((section) => section.value === currentTab) ?? settingsSections[0];
  const CurrentSectionIcon = currentSection.icon;

  // Updates URL when tab changes, so on refresh we stay on same tab
  const handleTabChange = (value: SettingsTab) => {
    setSearchParams({ tab: value });
  };

  const renderActiveSection = () => {
    switch (currentTab) {
      case "materials":
        return <MaterialsManager />;
      case "machines":
        return <MachinesManager />;
      case "constants":
        return <ConstantsManager />;
      case "gcodes":
        return <GcodeManager />;
      case "customers":
        return <SettingsCRM />;
      case "employees":
        return <SettingsEmployee />;
      case "labor":
        return <SettingsLabor />;
      case "recyclable":
        return <RecyclableManager />;
      case "company":
        return <CompanySettings />;
      default:
        return <MaterialsManager />;
    }
  };


  return (
    <div className="min-h-screen bg-background flex">
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      <aside className="w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-r border-emerald-900/30 flex flex-col h-screen sticky top-0 shadow-2xl z-40">
        <div className="p-6 border-b border-emerald-900/30 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Settings</h1>
            <CurrencySelector />
          </div>
          <p className="text-xs text-emerald-300/70 mt-1">Configuration Console</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {sectionGroups.map((group) => (
            <div key={group}>
              <p className="text-xs font-semibold text-cyan-400/60 uppercase tracking-wider px-3 mb-3">{group}</p>
              <div className="space-y-1">
                {settingsSections
                  .filter((section) => section.group === group)
                  .map((section) => {
                    const Icon = section.icon;
                    const isActive = section.value === currentTab;

                    return (
                      <button
                        key={section.value}
                        onClick={() => handleTabChange(section.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-w-0 ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-500/40 text-emerald-300"
                            : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{section.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-emerald-900/30 bg-gradient-to-r from-slate-950 to-slate-900 p-4 space-y-3">
          <Button
            variant="ghost"
            asChild
            className="w-full justify-start text-slate-300 hover:text-emerald-300 hover:bg-slate-800/50"
          >
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Calculator
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="border-b border-emerald-900/20 bg-gradient-to-r from-slate-950 to-slate-900 sticky top-0 z-30 shadow-lg">
          <div className="px-6 md:px-8 py-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-emerald-300/80">
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">System Configuration</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <h2 className="text-2xl font-bold text-white break-words">{currentSection.label}</h2>
                <Badge variant="secondary">{currentSection.group}</Badge>
              </div>
              <p className="text-sm text-emerald-200/70 mt-1 max-w-3xl break-words">{currentSection.description}</p>
            </div>
            <Badge variant="secondary" className="h-fit">{settingsSections.length} Modules</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-4 md:px-8 py-6 md:py-8 pb-20 space-y-6">
          <Card className="shadow-elevated border-emerald-900/30 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden">
            <div className="p-4 md:p-6 animate-fade-in">
              <div className="flex items-start gap-3 mb-5 pb-4 border-b border-emerald-900/20">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5">
                  <CurrentSectionIcon className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white break-words">{currentSection.label}</h3>
                  <p className="text-sm text-emerald-200/70 break-words">{currentSection.description}</p>
                </div>
              </div>

              {renderActiveSection()}
            </div>
          </Card>

          <SettingsExportImport />
        </div>
      </main>
    </div>
  );
};

export default Settings;
