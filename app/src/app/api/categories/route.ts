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

    const rawCategories = await db.collection("categories").find({}).toArray();
    await client.close();

    const categories = rawCategories.map((cat: any) => ({
      _id: cat._id,
      name: cat.name,
      type: cat.type,
      color: cat.color,
      description: cat.description,
      budgetGroup: cat.budget_group || cat.budgetGroup || "Altro",
      parentCategory: cat.parent_category || cat.parentCategory || null,
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Errore GET Categories:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}