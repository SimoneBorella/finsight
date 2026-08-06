import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient, ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const objectives = await db.collection("objectives").find({ userId }).toArray();
    await client.close();

    const savingsGoal = objectives.find((obj) => obj.type === "savings") || null;
    const spendingGoals = objectives.filter((obj) => obj.type === "spending");

    return NextResponse.json({ savingsGoal, spendingGoals }, { status: 200 });
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

    const userId = (session.user as any).id;
    const data = await req.json();
    
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");
    const collection = db.collection("objectives");

    if (data.action === "setSavings") {
      await collection.updateOne(
        { userId, type: "savings" },
        { 
          $set: { 
            amount: data.amount, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    } else if (data.action === "addSpending") {
      await collection.insertOne({
        userId,
        type: "spending",
        name: data.name,
        amount: data.amount,
        categories: data.categories,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await client.close();
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "missingId" }, { status: 400 });

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    await db.collection("objectives").deleteOne({ 
      _id: new ObjectId(id),
      userId: (session.user as any).id 
    });

    await client.close();
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}