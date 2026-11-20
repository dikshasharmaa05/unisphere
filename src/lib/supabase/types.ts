/**
 * Database types, generated from the live schema into `types.gen.ts`.
 * Regenerate after each migration:  npm run db:types
 */
export type { Database, Json } from "./types.gen";
import type { Database } from "./types.gen";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ReviewModel = Database["public"]["Enums"]["review_model"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
