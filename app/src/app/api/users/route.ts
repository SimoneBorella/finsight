import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient } from "mongodb";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const users = await db.collection("users").find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    await client.close();

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    
    if (!session || (currentUserRole !== "superuser" && currentUserRole !== "admin")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    if (role === "superuser") {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    if (currentUserRole === "admin") {
      role = "user";
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const emailExists = await db.collection("users").findOne({ email });
    if (emailExists) {
      await client.close();
      return NextResponse.json({ error: "emailInUse" }, { status: 400 });
    }

    const nameExists = await db.collection("users").findOne({ name });
    if (nameExists) {
      await client.close();
      return NextResponse.json({ error: "nameInUse" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password_hash,
      role, 
      created_at: new Date()
    };

    const result = await db.collection("users").insertOne(newUser);
    await client.close();

    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("Errore Creazione Utente:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}