import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5 font-medium"
      title={language === 'en' ? 'اردو میں تبدیل کریں' : 'Switch to English'}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {language === 'en' ? 'اردو' : 'EN'}
      </span>
      <span className="sm:hidden">
        {language === 'en' ? 'UR' : 'EN'}
      </span>
    </Button>
  );
}
