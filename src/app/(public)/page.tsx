import { AdSlot } from "@/components/ads/AdSlot";
import { ArchivePreview } from "@/components/landing/ArchivePreview";
import { Disciplines } from "@/components/landing/Disciplines";
import { DisciplineTicker } from "@/components/landing/DisciplineTicker";
import { Guidelines } from "@/components/landing/Guidelines";
import { Hero } from "@/components/landing/Hero";
import { Indexing } from "@/components/landing/Indexing";
import { JoinCta } from "@/components/landing/JoinCta";
import { LatestResearch } from "@/components/landing/LatestResearch";
import { getHomeData } from "@/lib/home/queries";

export default async function HomePage() {
  const home = await getHomeData();
  return (
    <>
      <Hero featured={home.featured ?? undefined} />
      <DisciplineTicker />
      <LatestResearch papers={home.latest ?? undefined} />
      <Disciplines />
      <AdSlot placement="landing-mid" className="container-page pt-16" />
      <ArchivePreview issues={home.issues ?? undefined} />
      <Guidelines />
      <Indexing />
      <JoinCta />
    </>
  );
}
