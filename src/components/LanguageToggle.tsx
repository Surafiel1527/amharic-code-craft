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
        <Button variant="outline" size="sm" className="gap-2 transition-all hover-scale">
          <Languages className="h-4 w-4" />
          {language === "en" ? "English" : "አማርኛ"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50 animate-fade-in">
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
          🇪🇹 አማርኛ (Amharic)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};