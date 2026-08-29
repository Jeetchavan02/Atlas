const { MongoClient } = require('mongodb');
// Let's connect to the DB and check the last conversation messages
async function main() {
  const client = new MongoClient('mongodb://localhost:27017/atlas');
  await client.connect();
  const db = client.db();
  const conv = await db.collection('aiconversations').find({}).sort({updatedAt:-1}).limit(1).toArray();
  console.log(JSON.stringify(conv, null, 2));
  await client.close();
}
main();
