import fs from "fs";
import path from "path";

// Load environment variables from .env
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  
  const paths = [
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      }
      return;
    }
  }
}

loadEnv();

import { prisma } from "../lib/prisma";

async function main() {
  const reviews = await prisma.problemReview.findMany();
  console.log("Total ProblemReviews in database:", reviews.length);
  console.log("ProblemReviews:", JSON.stringify(reviews, null, 2));
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
