// 매체 상태 문자열 → 켜짐/꺼짐/모름. "켜져 있나" 판정은 이 분류 하나만 쓴다
// (화면 필터 3버킷 `statusBucket`(components/ui/primitives)도 이 위에 얹었다, 2026-10-27).
// 모름(Meta WITH_ISSUES·IN_PROCESS·PENDING_REVIEW 등 경계 상태)을 어느 쪽으로 볼지는 호출부 몫이다:
//  - 조치 후보·목표 상태는 켜진 게 확인된 것만 대상으로 삼는다(isConfirmedOn)
//  - 현황비교 신호는 꺼진 게 확인된 것만 뺀다(isNotOff) — 경계 상태도 돈이 나가고 있을 수 있어서

export type StatusClass = "on" | "off" | "unknown";

const ON = new Set(["ACTIVE", "ENABLED", "ELIGIBLE", "LEARNING"]);
const OFF = /PAUSED|REMOVED|DELETED|DISABLED|ARCHIVED|OFF/i;

export function classifyStatus(status: string | null | undefined): StatusClass {
  if (status == null) return "unknown";
  if (ON.has(status)) return "on";
  return OFF.test(status) ? "off" : "unknown";
}

export const isConfirmedOn = (status: string | null | undefined): boolean => classifyStatus(status) === "on";
export const isNotOff = (status: string | null | undefined): boolean => classifyStatus(status) !== "off";
