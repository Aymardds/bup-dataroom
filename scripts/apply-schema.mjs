import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL || process.env.LOVABLE_DB_MIGRATION_URL;

if (!connectionString) {
  console.error("❌ Aucune variable DATABASE_URL trouvée dans le fichier .env.");
  console.log("👉 Vous pouvez :");
  console.log("   1. Coller le contenu de supabase/schema.sql directement dans le SQL Editor de Supabase (Dashboard -> SQL Editor -> New Query -> Run).");
  console.log("   2. Ou ajouter DATABASE_URL=\"postgresql://postgres:[VOTRE_MOT_DE_PASSE]@db.jzhrlhifidptxfnvvgdp.supabase.co:5432/postgres\" dans .env et réexécuter `npm run db:apply`.");
  process.exit(1);
}

const sqlFile = path.resolve(process.cwd(), "supabase/schema.sql");
const sqlContent = fs.readFileSync(sqlFile, "utf-8");

console.log("🚀 Connexion à la base de données Supabase...");
const sql = postgres(connectionString, { ssl: "require", max: 1 });

try {
  console.log("⚙️  Application du schéma et des règles d'architecture...");
  await sql.unsafe(sqlContent);
  console.log("✅ Architecture Supabase appliquée avec succès !");
} catch (err) {
  console.error("❌ Erreur lors de l'application du schéma :", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
