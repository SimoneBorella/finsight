import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    // Recupera solo ID e nome per ragioni di sicurezza e payload
    const users = await db.collection("users").find({}, { projection: { name: 1 } }).toArray();
    await client.close();

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}