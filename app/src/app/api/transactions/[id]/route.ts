import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient, ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalidId" }, { status: 400 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const result = await db.collection("transactions").deleteOne({ _id: new ObjectId(id) });
    await client.close();

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "notFound" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Errore DELETE:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}

export async function PUT(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalidId" }, { status: 400 });
    }

    const body = await req.json();
    const { amount, currency, type, category, description, date } = body;

    if (amount === undefined || amount === null || !type || !category) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    if (amount < 1) { 
      return NextResponse.json({ error: "invalidAmount" }, { status: 400 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const categoryExists = await db.collection("categories").findOne({ name: category, type: type });
    if (!categoryExists) {
      await client.close();
      return NextResponse.json({ error: "invalidCategory" }, { status: 400 });
    }

    const updateData = {
      amount,
      currency: currency || "EUR",
      type,
      category: categoryExists.name,
      description: description || "",
      date: new Date(date),
      updated_at: new Date(),
    };

    const result = await db.collection("transactions").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "notFound" }, { status: 404 });
    }

    return NextResponse.json({ message: "Updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Errore PUT:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}