import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, TrendingUp, Shield, Settings, LogOut, Keyboard, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { DynamicComponent } from "@/components/DynamicComponent";

interface MobileNavProps {
  isAdmin: boolean;
  onShowShortcuts: () => void;
  onSignOut: () => void;
}

export const MobileNav = ({ isAdmin, onShowShortcuts, onSignOut }: MobileNavProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[350px]">
        <div className="flex flex-col gap-4 mt-8">
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          
          <div className="border-t pt-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/builder")}
            >
              <Code className="h-4 w-4" />
              Builder
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/explore")}
            >
              <TrendingUp className="h-4 w-4" />
              {t("header.explore")}
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/admin")}
              >
                <Shield className="h-4 w-4" />
                {t("header.admin")}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={onShowShortcuts}
            >
              <Keyboard className="h-4 w-4" />
              {t("shortcuts.title")}
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
              {t("header.settings")}
            </Button>

            <DynamicComponent name="Button-SignOut">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4" />
                {t("header.logout")}
              </Button>
            </DynamicComponent>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
