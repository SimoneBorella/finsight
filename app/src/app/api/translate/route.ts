import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Verifica dell'autenticazione
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 2. Lettura del payload
    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    // 3. Chiamata a MyMemory API
    const langpair = `Autodetect|${targetLanguage}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    
    const response = await fetch(url, {
      method: "GET",
    });

    const data = await response.json();

    // 4. Controllo del risultato
    // Se la traduzione ha avuto successo e il testo esiste, la restituiamo
    if (data && data.responseData && typeof data.responseData.translatedText === 'string') {
      
      // Controllo aggiuntivo: MyMemory a volte inserisce l'errore direttamente nel testo tradotto
      if (!data.responseData.translatedText.includes("MYMEMORY WARNING") && 
          !data.responseData.translatedText.includes("PLEASE SELECT TWO DISTINCT LANGUAGES")) {
        
        return NextResponse.json({ 
          translatedText: data.responseData.translatedText 
        });
      }
    }

    // 5. GESTIONE SILENZIOSA DEGLI ERRORI
    // In qualsiasi altro caso (lingue identiche, limite superato, ecc.), 
    // restituiamo un codice 200 con il flag "sameLanguage" per dire al 
    // frontend di fermarsi silenziosamente senza causare errori in console.
    return NextResponse.json({ sameLanguage: true });

  } catch (error) {
    console.error("Errore API Traduzione:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}