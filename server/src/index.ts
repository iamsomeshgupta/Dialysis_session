import 'dotenv/config';
import { createApp } from './app.js';
import { connectToDatabase } from './db.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

async function main() {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});