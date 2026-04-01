import { LandingPage } from "@/components/landing-page";
import { getLandingCoverflowSongs } from "@/lib/landing/get-landing-coverflow-songs";

export const revalidate = 120;

export default async function Home() {
  const songs = await getLandingCoverflowSongs();
  return <LandingPage songs={songs} />;
}
