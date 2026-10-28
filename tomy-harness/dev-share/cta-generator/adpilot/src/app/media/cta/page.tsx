// 미디어 축 CTA 관리 — 리다이렉트 링크와 클릭 통계. 쓰기는 공개 리다이렉트에 바로 반영돼 확인창을 거친다. 2026-10-28 스펙 2-4.
import { CtaWorkspace } from "@/components/media/CtaWorkspace";

export const dynamic = "force-dynamic";

export default function MediaCtaPage() {
  return <CtaWorkspace />;
}
