import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { MongoClient, ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    
    // SOLO IL SUPERUSER PUO' CAMBIARE RUOLI
    if (!session || (session.user as any).role !== "superuser") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const targetUserId = params.id;
    const { role } = await req.json();

    // Il superuser può promuovere ad admin o declassare a user, ma non può creare altri superuser
    if (role !== "admin" && role !== "user") {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const userToUpdate = await db.collection("users").findOne({ _id: new ObjectId(targetUserId) });
    if (!userToUpdate) {
      await client.close();
      return NextResponse.json({ error: "notFound" }, { status: 404 });
    }

    // Non si può modificare il ruolo di un superuser
    if (userToUpdate.role === "superuser") {
      await client.close();
      return NextResponse.json({ error: "cannotDeleteAdmin" }, { status: 403 });
    }

    await db.collection("users").updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: { role: role } }
    );

    await client.close();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH Errore API:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    const executingUserId = (session?.user as any)?.id;
    const executingUserRole = (session?.user as any)?.role;

    // SOLO IL SUPERUSER PUO' ELIMINARE UTENTI
    if (!session || executingUserRole !== "superuser") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const targetUserId = params.id;

    if (targetUserId === executingUserId) {
      return NextResponse.json({ error: "cannotDeleteSelf" }, { status: 400 });
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db("finsight_db");

    const userToDelete = await db.collection("users").findOne({ _id: new ObjectId(targetUserId) });
    if (!userToDelete) {
      await client.close();
      return NextResponse.json({ error: "notFound" }, { status: 404 });
    }

    // Un superuser non può essere eliminato
    if (userToDelete.role === "superuser") {
      await client.close();
      return NextResponse.json({ error: "cannotDeleteAdmin" }, { status: 403 });
    }

    // Migrazione delle transazioni al superuser che sta eseguendo l'azione
    await db.collection("transactions").updateMany(
      { userId: targetUserId }, 
      { $set: { userId: executingUserId } }
    );

    await db.collection("users").deleteOne({ _id: new ObjectId(targetUserId) });

    await client.close();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Errore API:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}