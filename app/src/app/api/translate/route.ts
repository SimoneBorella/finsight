import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    const langpair = `Autodetect|${targetLanguage}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    
    const response = await fetch(url, {
      method: "GET",
    });

    const data = await response.json();

    if (data && data.responseData && typeof data.responseData.translatedText === 'string') {
      
      if (!data.responseData.translatedText.includes("MYMEMORY WARNING") && 
          !data.responseData.translatedText.includes("PLEASE SELECT TWO DISTINCT LANGUAGES")) {
        
        return NextResponse.json({ 
          translatedText: data.responseData.translatedText 
        });
      }
    }

    return NextResponse.json({ sameLanguage: true });

  } catch (error) {
    console.error("Errore API Traduzione:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}