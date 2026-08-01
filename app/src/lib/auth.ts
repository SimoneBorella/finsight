import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        // Abbiamo cambiato "email" in "identifier" per renderlo generico
        identifier: { label: "Username o Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const client = new MongoClient(process.env.MONGODB_URI!);
        await client.connect();
        const db = client.db("finsight_db");

        // 1. IL SISTEMA CAPISCE COSA È STATO INSERITO
        const isEmail = credentials.identifier.includes("@");
        
        // 2. COSTRUISCE LA QUERY DINAMICA
        const query = isEmail 
          ? { email: credentials.identifier } 
          : { name: credentials.identifier };

        // 3. CERCA L'UTENTE
        const user = await db.collection("users").findOne(query);
        await client.close();

        // Se l'utente non esiste, fallisce il login
        if (!user) return null;

        // Verifica la password criptata
        const isMatch = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isMatch) return null;

        // Ritorna l'oggetto utente che verrà salvato nel JWT
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role, // "admin" o "user"
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};