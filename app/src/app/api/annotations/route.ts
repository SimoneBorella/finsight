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

    const annotations = await db.collection("annotations")
      .find({ type: "dashboard_notes" })
      .sort({ order: 1 })
      .toArray();

    await client.close();

    return NextResponse.json({ notes: annotations });
    
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { notes } = await req.json();

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");
    const collection = db.collection("annotations");

    await collection.deleteMany({ type: "dashboard_notes" });

    if (notes && notes.length > 0) {
      const documentsToInsert = notes.map((note: any, index: number) => ({
        type: "dashboard_notes",
        content: note.content,
        order: index,
        updated_at: new Date(),
        updated_by: (session.user as any).id
      }));

      await collection.insertMany(documentsToInsert);
    }

    await client.close();
    return NextResponse.json({ message: "Saved successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}