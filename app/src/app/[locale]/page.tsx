"use client";

import * as React from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter, Link } from "@/i18n/routing"; 
import { useTranslations } from "next-intl"; 
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react"; 

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations("Landing");

  React.useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-[calc(100dvh-var(--header-height)-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center min-h-[calc(100dvh-var(--header-height)-4rem)] py-12 px-4 sm:py-20 text-center overflow-hidden">
      
      {/* BACKGROUND DECORATIVO: Griglia sottile ed effetto glow centrato in sicurezza */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-16 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-30 blur-[100px]"></div>
      </div>

      <div className="flex flex-col items-center justify-center z-10 max-w-3xl">
        
        {/* LOGO CON EFFETTO GLOW E TITOLO */}
        <div className="flex flex-col items-center justify-center gap-6">
          
          {/* LOGO ACCATTIVANTE CON GLOW */}
          <div className="relative group mb-2">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-primary to-blue-500 opacity-30 blur-xl group-hover:opacity-60 transition duration-500"></div>
            <div className="relative p-3 bg-card/80 backdrop-blur-md border rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-105">
              <Image
                src="/favicon.ico"
                alt="FinSight logo"
                width={72}
                height={72}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight">
            <span className="inline-block pb-2 bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent leading-normal">
              FinSight
            </span> 
            {/* <br className="hidden sm:block" /> */}
            {/* <span className="inline-block pb-2 text-4xl sm:text-6xl bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent leading-normal">
              {t("titleHighlight")}
            </span> */}
          </h1>
        </div>

        {/* SOTTOTITOLO */}
        <p className="mt-6 max-w-[600px] text-lg sm:text-xl text-muted-foreground leading-relaxed">
          {t("subtitle")}
        </p>

        {/* PULSANTE LOG IN ANIMATO */}
        <div className="mt-10">
          <Button 
            asChild 
            size="lg" 
            className="group px-8 py-7 text-lg font-semibold shadow-xl shadow-primary/20 transition-all duration-300 hover:shadow-primary/40 hover:-translate-y-1 rounded-full"
          >
            <Link href="/login" className="flex items-center gap-2">
              {t("loginButton")}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
        
      </div>
    </div>
  );
}