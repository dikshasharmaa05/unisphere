/**
 * Database types, generated from the live schema into `types.gen.ts`.
 * Regenerate after each migration:  npm run db:types
 */
export type { Database, Json } from "./types.gen";
import type { Database } from "./types.gen";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type ReviewModel = Database["public"]["Enums"]["review_model"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type SubmissionStatus = Database["public"]["Enums"]["submission_status"];
export type ArticleType = Database["public"]["Enums"]["article_type"];
export type MediaKind = Database["public"]["Enums"]["media_kind"];
export type ReviewRecommendation = Database["public"]["Enums"]["review_recommendation"];
export type DecisionType = Database["public"]["Enums"]["decision_type"];
export type CommentStatus = Database["public"]["Enums"]["comment_status"];
