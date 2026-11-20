import { AdSlot } from "@/components/ads/AdSlot";
import { ArchivePreview } from "@/components/landing/ArchivePreview";
import { Disciplines } from "@/components/landing/Disciplines";
import { DisciplineTicker } from "@/components/landing/DisciplineTicker";
import { Guidelines } from "@/components/landing/Guidelines";
import { Hero } from "@/components/landing/Hero";
import { Indexing } from "@/components/landing/Indexing";
import { JoinCta } from "@/components/landing/JoinCta";
import { LatestResearch } from "@/components/landing/LatestResearch";

export default function HomePage() {
  return (
    <>
      <Hero />
      <DisciplineTicker />
      <LatestResearch />
      <Disciplines />
      <AdSlot placement="landing-mid" className="container-page pt-16" />
      <ArchivePreview />
      <Guidelines />
      <Indexing />
      <JoinCta />
    </>
  );
}
