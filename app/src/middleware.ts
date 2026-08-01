import { withAuth } from "next-auth/middleware";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

// 1. Inizializza il middleware per le lingue
const intlMiddleware = createIntlMiddleware(routing);

// 2. Inizializza il middleware per l'autenticazione
const authMiddleware = withAuth(
  function onSuccess(req) {
    // Se l'utente è loggato e ha i permessi, applica le regole della lingua
    return intlMiddleware(req);
  },
  {
    pages: {
      signIn: "/login", // Se non sei loggato, vai qui
    },
  }
);

// 3. Funzione principale del Middleware
export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Definisci quali percorsi dell'interfaccia utente devono essere protetti dal login
  // (La regex controlla che la protezione avvenga sia con il prefisso /it o /en, sia senza)
  const isProtectedRoute = /^\/(it|en)?\/(dashboard|settings|annotations)/.test(pathname);

  if (isProtectedRoute) {
    return (authMiddleware as any)(req);
  }

  // Per tutte le altre pagine pubbliche dell'interfaccia (es. /login, /) applica solo le lingue
  return intlMiddleware(req);
}

export const config = {
  // IL SEGRETO È QUI: 
  // (?!api) esclude esplicitamente tutte le rotte che iniziano per /api
  // In questo modo next-intl non toccherà mai le tue chiamate API e non crasheranno.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};