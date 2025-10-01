import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2 transition-all hover-scale text-xs sm:text-sm px-2 sm:px-3">
          <span className="hidden sm:inline">{language === "en" ? "English" : "አማርኛ"}</span>
          <span className="sm:hidden">{language === "en" ? "EN" : "አማ"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50 animate-fade-in min-w-[150px]">
        <DropdownMenuItem 
          onClick={() => setLanguage("en")}
          className="cursor-pointer hover:bg-accent transition-colors"
        >
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage("am")}
          className="cursor-pointer hover:bg-accent transition-colors"
        >
          🇪🇹 አማርኛ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};