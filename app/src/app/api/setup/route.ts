import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    // Controllo di sicurezza: se esistono già utenti, fermiamo tutto
    const usersCount = await db.collection("users").countDocuments();
    if (usersCount > 0) {
      await client.close();
      return NextResponse.json({ message: "Setup already completed. Existing users." }, { status: 403 });
    }

    // Creiamo l'admin
    const hashedPassword = await bcrypt.hash("admin", 10);
    
    await db.collection("users").insertOne({
      name: "admin",
      email: "admin@finsight.local",
      password_hash: hashedPassword,
      role: "admin",
      created_at: new Date(),
    });

    await client.close();
    return NextResponse.json({ message: "User admin created successfully!" });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}