// 표를 **이미지(PNG)로** 내보낸다 — 카톡·노션·메일에 그대로 붙일 수 있는 그림.
//
// 왜 DOM 캡처(html2canvas 등)가 아닌가: ① 새 패키지 없이 되고(번들·보안 표면 증가 없음)
// ② 이 프로젝트 색은 전부 CSS 변수(`var(--color-ink)`)라 DOM 캡처 라이브러리가 자주 놓친다
// ③ 화면 스크롤·sticky 헤더에 잘린 채로 찍히는 사고가 없다.
// 대신 **화면 표와 같은 데이터**를 받아 캔버스에 다시 그린다(CSV 내보내기와 같은 원칙 —
// 표가 쓰는 값을 그대로 넘겨받고, 여기서 집계를 새로 하지 않는다).
//
// 확대해도 깨지지 않게 DPR 2로 그린다(시각자료 규칙 — 텍스트가 뭉개지면 붙여넣는 의미가 없다).

const DPR = 2;
// 캔버스는 CSS 토큰(var())을 못 읽는다 — globals.css의 값과 **같은 hex**를 손으로 적는다.
// (토큰이 바뀌면 여기도 바꿀 것. 표 이미지에서만 쓰는 사본이라 화면 색과 갈리면 눈에 바로 띈다.)
const C = {
  ink: '#161b20',
  inkSoft: '#555b61',
  inkMute: '#6d7379',
  faint: '#a6acb2', // 값 없는 칸(가운뎃점)
  border: '#e2e6eb',
  hairline: '#eceff2',
  surface: '#ffffff',
  chrome: '#f5f6f7',
  scopeBg: '#e9eaec', // ink 9% — 스코프(고방/U사장님) 총합 줄
  groupBg: '#f2f3f4', // ink 5%
  bucketBg: '#f9f9fa', // ink 2.5%
  tintBg: '#f7f8f8', // 분기합계 열 띠
} as const;

const FONT = `'Malgun Gothic', 'Apple SD Gothic Neo', system-ui, -apple-system, sans-serif`;
const f = (size: number, weight: 400 | 600 | 700 = 400) => `${weight} ${size}px ${FONT}`;

export type ImgAlign = 'left' | 'right';
export type ImgCell = { text: string; align?: ImgAlign; tone?: 'normal' | 'mute' | 'faint' | 'strong' };
export type ImgRowTone = 'scope' | 'group' | 'bucket' | 'item' | 'total';
/** 한 행 — `tone`이 배경·굵기를, `indent`가 위계(그룹›버킷›항목)를 만든다. */
export type ImgRow = { cells: ImgCell[]; tone: ImgRowTone; indent?: number };

export type TableImageSpec = {
  title: string;
  subtitle?: string;
  headers: ImgCell[];
  rows: ImgRow[];
  /** 옅은 띠를 두르는 열 인덱스(분기합계 열 등) — 화면 표의 `QCELL`과 같은 역할. */
  tintColumns?: number[];
  /** 표 아래 한 줄(기간·출처 등). */
  footnote?: string;
};

const PAD = 24; // 이미지 바깥 여백
const CELL_X = 12; // 셀 좌우 여백
const HEAD_H = 30;
const ROW_H = { scope: 32, group: 30, bucket: 27, item: 25, total: 32 } as const;
const INDENT = 14;

function rowFont(tone: ImgRowTone, cell: ImgCell) {
  if (tone === 'scope') return f(13.5, 700);
  if (cell.tone === 'strong' || tone === 'group' || tone === 'total') return f(13, 700);
  if (tone === 'bucket') return f(12.5, 600);
  return f(12.5, 400);
}

function cellColor(tone: ImgRowTone, cell: ImgCell) {
  if (cell.tone === 'faint') return C.faint;
  if (cell.tone === 'mute') return C.inkMute;
  if (cell.tone === 'strong') return C.ink;
  if (tone === 'scope' || tone === 'group' || tone === 'total') return C.ink;
  return C.inkSoft;
}

const rowBg = (tone: ImgRowTone) =>
  tone === 'scope'
    ? C.scopeBg
    : tone === 'group'
      ? C.groupBg
      : tone === 'bucket'
        ? C.bucketBg
        : tone === 'total'
          ? C.chrome
          : C.surface;

/**
 * 표 그림을 그려 PNG로 내려받는다. 열 폭은 **글자 실측치**(measureText)로 정한다 —
 * 고정폭으로 잡으면 항목명이 잘리거나(정보 손실) 숫자 칸이 텅 빈다.
 */
export async function downloadTableImage(filename: string, spec: TableImageSpec): Promise<void> {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return;

  const cols = spec.headers.length;
  const widths = spec.headers.map((h, i) => {
    measure.font = f(12, 600);
    let w = measure.measureText(h.text).width;
    for (const r of spec.rows) {
      const cell = r.cells[i];
      if (!cell) continue;
      measure.font = rowFont(r.tone, cell);
      const indent = i === 0 ? (r.indent ?? 0) * INDENT : 0;
      w = Math.max(w, measure.measureText(cell.text).width + indent);
    }
    return Math.ceil(w) + CELL_X * 2;
  });

  const tableW = widths.reduce((s, w) => s + w, 0);
  measure.font = f(17, 700);
  const titleW = measure.measureText(spec.title).width;
  measure.font = f(12);
  const subW = spec.subtitle ? measure.measureText(spec.subtitle).width : 0;
  const noteW = spec.footnote ? measure.measureText(spec.footnote).width : 0;

  const headBlockH = 26 + (spec.subtitle ? 20 : 0) + 14;
  const bodyH = spec.rows.reduce((s, r) => s + ROW_H[r.tone], 0);
  const noteH = spec.footnote ? 26 : 0;
  const w = Math.ceil(Math.max(tableW, titleW, subW, noteW) + PAD * 2);
  const h = Math.ceil(headBlockH + HEAD_H + bodyH + noteH + PAD * 2);

  canvas.width = w * DPR;
  canvas.height = h * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(DPR, DPR);
  ctx.textBaseline = 'middle';

  // 바탕 — 투명으로 두면 다크 배경에 붙였을 때 글자가 사라진다.
  ctx.fillStyle = C.surface;
  ctx.fillRect(0, 0, w, h);

  let y = PAD;
  ctx.fillStyle = C.ink;
  ctx.font = f(17, 700);
  ctx.textAlign = 'left';
  ctx.fillText(spec.title, PAD, y + 10);
  y += 26;
  if (spec.subtitle) {
    ctx.fillStyle = C.inkMute;
    ctx.font = f(12);
    ctx.fillText(spec.subtitle, PAD, y + 8);
    y += 20;
  }
  y += 14;

  const x0 = PAD;
  const colX: number[] = [];
  let acc = x0;
  for (const cw of widths) {
    colX.push(acc);
    acc += cw;
  }
  const tint = new Set(spec.tintColumns ?? []);
  const tableTop = y;
  const tableBottom = y + HEAD_H + bodyH;

  // 머리
  ctx.fillStyle = C.surface;
  ctx.fillRect(x0, y, tableW, HEAD_H);
  for (const i of tint) {
    ctx.fillStyle = C.tintBg;
    ctx.fillRect(colX[i], y, widths[i], HEAD_H);
  }
  ctx.font = f(12, 600);
  ctx.fillStyle = C.inkMute;
  spec.headers.forEach((hd, i) => {
    const right = (hd.align ?? (i === 0 ? 'left' : 'right')) === 'right';
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(hd.text, right ? colX[i] + widths[i] - CELL_X : colX[i] + CELL_X, y + HEAD_H / 2);
  });
  y += HEAD_H;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y - 0.5);
  ctx.lineTo(x0 + tableW, y - 0.5);
  ctx.stroke();

  // 본문
  for (const r of spec.rows) {
    const rh = ROW_H[r.tone];
    ctx.fillStyle = rowBg(r.tone);
    ctx.fillRect(x0, y, tableW, rh);
    if (r.tone === 'item') {
      for (const i of tint) {
        ctx.fillStyle = C.tintBg;
        ctx.fillRect(colX[i], y, widths[i], rh);
      }
    }
    // 위계 경계선 — 그룹·합계는 진한 선, 나머지는 헤어라인(화면 표의 ROW_TONE과 같은 규칙).
    ctx.strokeStyle = r.tone === 'scope' || r.tone === 'group' || r.tone === 'total' ? C.border : C.hairline;
    ctx.beginPath();
    ctx.moveTo(x0, y + 0.5);
    ctx.lineTo(x0 + tableW, y + 0.5);
    ctx.stroke();

    r.cells.forEach((cell, i) => {
      if (i >= cols) return;
      ctx.font = rowFont(r.tone, cell);
      ctx.fillStyle = cellColor(r.tone, cell);
      const right = (cell.align ?? (i === 0 ? 'left' : 'right')) === 'right';
      ctx.textAlign = right ? 'right' : 'left';
      const indent = i === 0 ? (r.indent ?? 0) * INDENT : 0;
      ctx.fillText(cell.text, right ? colX[i] + widths[i] - CELL_X : colX[i] + CELL_X + indent, y + rh / 2);
    });
    y += rh;
  }

  // 표 테두리 + 열 구분선
  ctx.strokeStyle = C.border;
  ctx.strokeRect(x0 + 0.5, tableTop + 0.5, tableW - 1, tableBottom - tableTop - 1);
  ctx.strokeStyle = C.hairline;
  colX.slice(1).forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, tableTop);
    ctx.lineTo(cx + 0.5, tableBottom);
    ctx.stroke();
  });

  if (spec.footnote) {
    ctx.font = f(11.5);
    ctx.fillStyle = C.inkMute;
    ctx.textAlign = 'left';
    ctx.fillText(spec.footnote, x0, tableBottom + 15);
  }

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
