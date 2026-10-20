import type { Metadata } from "next";
import TempleExperience from "@/components/experience/TempleExperience";

export const metadata: Metadata = {
  title: "玄境 · 三维空间骨架预览",
  description: "古铜命盘与东方殿堂的可交互结构预览。",
};

export default function ExperiencePreviewPage() {
  return <TempleExperience />;
}
