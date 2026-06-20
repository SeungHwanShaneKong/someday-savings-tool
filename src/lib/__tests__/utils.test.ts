// [CL-COVERAGE50-20260620] utils(cn) 단위 검증 — 미테스트 영역 커버리지 보강
import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("utils.cn — Tailwind 클래스 병합/조건부/충돌 dedupe", () => {
  // UT.1 — Happy path: 단순 문자열 인자들이 공백으로 결합된다.
  it("UT.1 여러 문자열 인자를 공백으로 결합한다", () => {
    const result = cn("px-2", "py-1", "text-sm");
    // 순서 보존 + 단일 공백 구분
    expect(result).toBe("px-2 py-1 text-sm");
  });

  // AC.1 — clsx 조건부: falsy(false/null/undefined/0/"")는 무시되고 truthy만 남는다.
  it("AC.1 falsy 값(false·null·undefined·0·빈문자열)을 무시한다", () => {
    const isActive = false;
    const maybe: string | null = null;
    const result = cn(
      "base",
      isActive && "active",
      maybe,
      undefined,
      0 && "zero-skip",
      "",
      "end",
    );
    // active/zero-skip 등은 falsy로 탈락 → base, end 만 남음
    expect(result).toBe("base end");
    expect(result).not.toContain("active");
    expect(result).not.toContain("zero-skip");
  });

  // AC.2 — twMerge 충돌 dedupe: 같은 Tailwind 유틸리티 그룹은 뒤 값이 앞 값을 이긴다.
  it("AC.2 충돌하는 Tailwind 유틸리티는 마지막 값으로 dedupe된다", () => {
    // padding-x 충돌 → 뒤의 px-4 만 유지
    expect(cn("px-2", "px-4")).toBe("px-4");
    // 동일 그룹(배경색) 충돌 → 마지막만 유지
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    // 비충돌 유틸은 둘 다 보존, 충돌 유틸만 마지막으로 축약
    const merged = cn("p-4 text-sm", "p-2");
    expect(merged).toContain("text-sm");
    expect(merged).toContain("p-2");
    expect(merged).not.toContain("p-4");
  });

  // BV.1 — Boundary: 인자 없음 / 전부 falsy → 빈 문자열을 반환한다(throw 금지).
  it("BV.1 인자가 없거나 전부 falsy면 빈 문자열을 반환한다", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined, "")).toBe("");
    expect(cn([])).toBe("");
  });

  // EC.1 — Edge: 배열·객체 입력(clsx ClassValue) 정상 평탄화 + 조건부 객체 키 처리.
  it("EC.1 배열·조건부 객체 입력을 평탄화하고 truthy 키만 채택한다", () => {
    // 중첩 배열 평탄화
    expect(cn(["a", ["b", "c"]])).toBe("a b c");
    // 객체: 값이 truthy인 키만 포함
    const result = cn("base", { active: true, hidden: false, "text-lg": 1 });
    expect(result).toContain("base");
    expect(result).toContain("active");
    expect(result).toContain("text-lg");
    expect(result).not.toContain("hidden");
  });

  // EC.2 — Edge(twMerge×조건부 결합): 조건부로 켜진 충돌 클래스도 마지막 승자로 정리된다.
  it("EC.2 조건부로 추가된 충돌 클래스도 twMerge로 마지막 값만 남긴다", () => {
    const disabled = true;
    // 기본 텍스트색 + 조건부 텍스트색 충돌 → 조건부(뒤) 값이 승리
    const result = cn("text-gray-900", disabled && "text-gray-400");
    expect(result).toBe("text-gray-400");

    // 조건이 거짓이면 충돌 없음 → 기본값 유지
    const enabledResult = cn("text-gray-900", false && "text-gray-400");
    expect(enabledResult).toBe("text-gray-900");

    // 중복 동일 클래스(공백·반복) 정규화: 같은 클래스 중복은 1개로
    expect(cn("flex", "flex")).toBe("flex");
  });
});
