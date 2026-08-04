"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import ReactCountryFlag from "react-country-flag";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();

  const handleLanguageChange = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <Select
      value={locale}
      onValueChange={handleLanguageChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-8 w-fit border-none bg-transparent px-2 shadow-none hover:bg-accent hover:text-accent-foreground focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
        <SelectValue placeholder="Lingua" />
      </SelectTrigger>
      
      <SelectContent>
        <SelectItem value="it" className="text-xs cursor-pointer">
          <div className="flex items-center gap-2">
            <ReactCountryFlag 
              countryCode="IT" 
              svg 
              style={{ width: '1.2em', height: '1.2em', borderRadius: '2px' }} 
            />
            <span>IT</span>
          </div>
        </SelectItem>
        
        <SelectItem value="en" className="text-xs cursor-pointer">
          <div className="flex items-center gap-2">
            <ReactCountryFlag 
              countryCode="GB" 
              svg 
              style={{ width: '1.2em', height: '1.2em', borderRadius: '2px' }} 
            />
            <span>EN</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}