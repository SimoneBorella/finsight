import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient } from "mongodb";
import { authOptions } from "@/lib/auth"; 

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, currency, type, category, description, date } = body;

    // VALIDAZIONI SERVER-SIDE
    if (amount === undefined || amount === null || !type || !category) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    if (amount < 0.01) {
      return NextResponse.json({ error: "invalidAmount" }, { status: 400 });
    }

    if (description && description.length > 255) {
      return NextResponse.json({ error: "descriptionTooLong" }, { status: 400 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const categoryExists = await db.collection("categories").findOne({ name: category, type: type });
    if (!categoryExists) {
      await client.close();
      return NextResponse.json({ error: "invalidCategory" }, { status: 400 });
    }

    const newTransaction = {
      userId: (session.user as any).id, 
      amount, 
      currency: currency || "EUR",
      type,
      category: categoryExists.name,
      description: description || "",
      date: new Date(date),
      created_at: new Date(),
    };

    const result = await db.collection("transactions").insertOne(newTransaction);
    await client.close();

    return NextResponse.json(
      { message: "Transaction saved successfully", id: result.insertedId },
      { status: 201 }
    );

  } catch (error) {
    console.error("Errore API Transazioni:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userIdFilter = searchParams.get("user");

    const query: any = {}; 

    if (type) query.type = type;
    if (category) query.category = category;
    if (userIdFilter) query.userId = userIdFilter;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const transactions = await db.collection("transactions")
      .find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalTransactions = await db.collection("transactions").countDocuments(query);
    const users = await db.collection("users").find({}, { projection: { name: 1 } }).toArray();
    
    const userMap = users.reduce((acc: any, user: any) => {
      acc[user._id.toString()] = user.name;
      return acc;
    }, {});

    const transactionsWithUserNames = transactions.map(tx => ({
      ...tx,
      userName: userMap[tx.userId?.toString()] || "Unknown User"
    }));

    await client.close();

    return NextResponse.json({
      transactions: transactionsWithUserNames,
      pagination: { skip, limit, total: totalTransactions }
    });

  } catch (error) {
    console.error("Errore GET Transazioni:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}