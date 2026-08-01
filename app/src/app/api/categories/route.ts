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

    // Formato atteso nella collection: { name: string, type: "income" | "expense", color: string }
    const categories = await db.collection("categories").find({}).toArray();
    await client.close();

    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}