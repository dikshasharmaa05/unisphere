import { PageTransition } from "@/components/motion/PageTransition";

/** Re-mounts on every navigation inside the public site → entrance transition. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
