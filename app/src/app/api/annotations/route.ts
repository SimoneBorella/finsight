import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient } from "mongodb";
import { authOptions } from "@/lib/auth"; 

const DEFAULT_MARKDOWN = `# Annotations`;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const annotation = await db.collection("annotations").findOne({ type: "dashboard_notes" });
    await client.close();

    if (annotation) {
      return NextResponse.json({ content: annotation.content });
    } else {
      return NextResponse.json({ content: DEFAULT_MARKDOWN });
    }
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

    const { content } = await req.json();

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    await db.collection("annotations").updateOne(
      { type: "dashboard_notes" }, // Il nostro ID fisso
      { 
        $set: { 
          content, 
          updated_at: new Date(),
          updated_by: (session.user as any).id
        } 
      },
      { upsert: true }
    );

    await client.close();
    return NextResponse.json({ message: "Saved successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}