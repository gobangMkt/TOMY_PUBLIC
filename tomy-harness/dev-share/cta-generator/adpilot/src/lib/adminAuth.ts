// write 엔드포인트(캠페인 생성·일시중지) 공용 인증 게이트.
// cron 라우트의 CRON_SECRET 패턴과 동일 — 시크릿 미설정 시 로컬은 통과(개발 편의), 배포본은 거부.
// ⚠️ 프로덕션에서 *_WRITE_ENABLED를 켜기 전에 반드시 ADMIN_API_TOKEN부터 설정한다 —
//    이게 없으면 프로덕션 URL을 아는 누구나 인증 없이 실제 캠페인을 pause/생성할 수 있다.

import { NextRequest } from "next/server";
import { WRITE_SWITCH_ENV } from "./types";
import { isDeployed } from "./siteGate";

// 시크릿이 없을 때: 배포본(VERCEL)은 거부, 로컬은 통과 — cronAuth와 같은 규칙.
// 배포본에서 통과시키면 토큰 등록 전에 배포한 순간 write 라우트가 누구에게나 열린다.
export function checkAdminToken(
  headerValue: string | null,
  secret: string | undefined,
  deployed: boolean = isDeployed()
): boolean {
  if (!secret) return !deployed;
  return headerValue === secret;
}

// types.ts의 채널별 정본에서 값만 뽑는다 — 같은 5개 env 이름을 여기서 또 손으로 나열하지 않는다
// (2026-08-21 감사 발견: 4개 API 라우트가 이 목록을 Record 형태로 각자 복제하고 있었다).
const WRITE_SWITCH_LIST = Object.values(WRITE_SWITCH_ENV);

/**
 * 미설정 시 통과(위 주석)는 CRON_SECRET과 같은 기존 패턴이지만, 이 게이트는 실제 매체에
 * 반영되는 write 경로를 지킨다 — write 스위치가 켜졌는데 토큰이 없으면 "누구나 통과"가
 * 조용히 배포될 수 있다. 막지는 않되(로컬 개발은 계속 되어야 한다) 서버 로그로 소리 낸다.
 */
export function warnIfWriteOpenWithoutToken(): string | null {
  if (process.env.ADMIN_API_TOKEN) return null;
  const openSwitch = WRITE_SWITCH_LIST.find((k) => process.env[k] === "1");
  if (!openSwitch) return null;
  const msg = `[adminAuth] ⚠️ ${openSwitch}=1인데 ADMIN_API_TOKEN이 없다 — pause/캠페인 생성 write 엔드포인트가 인증 없이 열려 있다.`;
  console.warn(msg);
  return msg;
}

export function authorizedAdmin(req: NextRequest): boolean {
  warnIfWriteOpenWithoutToken();
  return checkAdminToken(req.headers.get("x-admin-token"), process.env.ADMIN_API_TOKEN);
}

// 2026-09-25: `assertAiWriteAllowed`(AI가 이미 OFF인 엔티티에 한해 직접 write하는 경로, 2026-08-31
// 결정)를 걷어냈다 — AI는 이제 어떤 write 엔드포인트도 직접 못 부른다. AI는 추천값만 내고, 그
// 값을 실제로 내보내는 방아쇠는 항상 사람의 클릭이다(pause·budget·resume 라우트 모두 actor
// 필드 자체를 받지 않는다).
