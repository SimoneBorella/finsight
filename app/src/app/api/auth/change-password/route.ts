import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient, ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "passwordTooShort" },
        { status: 400 }
      );
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    if (!user) {
      await client.close();
      return NextResponse.json({ error: "notFound" }, { status: 404 });
    }

    if (!user.password_hash) {
      await client.close();
      console.error("L'utente non ha un campo password_hash nel DB.");
      return NextResponse.json({ error: "internalError" }, { status: 500 }); 
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    } catch (bcryptError) {
      await client.close();
      return NextResponse.json({ error: "invalidPassword" }, { status: 400 });
    }
    
    if (!isMatch) {
      await client.close();
      return NextResponse.json(
        { error: "invalidPassword" },
        { status: 400 }
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password_hash: hashedNewPassword } }
    );

    await client.close();

    return NextResponse.json(
      { success: true, message: "Password aggiornata con successo." },
      { status: 200 }
    );

  } catch (error) {
    console.error("Errore API Cambio Password:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}