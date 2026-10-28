'use client';

// 전체 화면 스켈레톤은 **첫 로드에만** 띄운다.
//
// 🚨 2026-09-21 사고(주간 흐름, 지적 "마감 데이터 입력했는데 계속 불러오는중만 뜨고 새로고침되며
// 정보는 안 들어와"). 화면들이 `if (loading) return <스켈레톤>`으로 짜여 있었는데, 그 `loading`은
// **첫 조회와 재조회를 구분하지 않는다**. 그래서 저장 직후 원장을 다시 받는 몇 초 동안 화면이
// 통째로 '불러오는 중…'으로 갈리고, 입력표(초안·행별 저장 결과)까지 언마운트돼 **방금 넣은 값이
// 사라진 것처럼** 보였다. 실제로는 원장에 다 들어가 있었다.
//
// 재조회 중에는 **직전 값을 계속 보여준다** — 훅들이 새 응답이 올 때까지 옛 데이터를 그대로 들고
// 있으므로 화면은 멀쩡하고, 값이 바뀌면 그 자리에서 갈린다(client-cache의 배경 갱신과 같은 계약).
import { useRef } from 'react';

/** 아직 한 번도 데이터를 받지 못한 상태인가(= 전체 스켈레톤을 띄워야 하는가). */
export function useFirstLoad(loading: boolean): boolean {
  const settled = useRef(false);
  if (!loading) settled.current = true;
  return loading && !settled.current;
}
