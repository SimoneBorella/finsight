import { MongoClient } from "mongodb";

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const uri = process.env.MONGODB_URI!;
const options = {};

if (!globalThis._mongoClientPromise) {
  client = new MongoClient(uri, options);
  globalThis._mongoClientPromise = client.connect();
}
clientPromise = globalThis._mongoClientPromise;

export default clientPromise;
