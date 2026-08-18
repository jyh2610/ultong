import type { Facility } from "../types/facility";

const MOCK_FACILITIES: Facility[] = [
  { id: "a", name: "시설A", category: "음식", type: "감성 카페", region: "서울", address: "서울 마포구 어딘가로 12", hours: "매일 10:00 - 21:00", updated: "2026.06.02", allowedSizes: ["소형"], weightLimitKg: 5, cageRequired: false, leashRequired: true, indoorAllowed: true, outdoorAllowed: true, confidence: "확실", reportCount: 0, rawText: "소형견(5kg 이하)만 실내 동반 가능, 목줄 착용 필수" },
  { id: "b", name: "시설B", category: "숙박", type: "독채 펜션", region: "강릉", address: "강원 강릉시 어딘가길 45", hours: "체크인 15:00 · 체크아웃 11:00", updated: "2026.05.20", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: false, leashRequired: true, indoorAllowed: true, outdoorAllowed: true, confidence: "확실", reportCount: 1, rawText: "견종 제한 없음, 실내외 동반 가능하나 리드줄 착용 필수" },
  { id: "c", name: "시설C", category: "관광지", type: "수목원", region: "제주", address: "제주 서귀포시 어딘가로 8", hours: "매일 09:00 - 18:00", updated: "2026.04.11", allowedSizes: ["소형", "중형"], weightLimitKg: 10, cageRequired: true, leashRequired: true, indoorAllowed: false, outdoorAllowed: true, confidence: "추정", reportCount: 4, rawText: "중형견 이하 동반 가능, 이동장 지참 권장 (실내 전시관 제외)" },
  { id: "d", name: "시설D", category: "쇼핑", type: "편집숍", region: "서울", address: "서울 성동구 어딘가길 3", hours: "매일 11:00 - 20:00", updated: "2026.06.15", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: true, leashRequired: false, indoorAllowed: true, outdoorAllowed: false, confidence: "확실", reportCount: 0, rawText: "이동장(케이지) 착용 시에만 매장 내 동반 가능" },
  { id: "e", name: "시설E", category: "음식", type: "해변 카페", region: "부산", address: "부산 해운대구 어딘가로 21", hours: "매일 10:00 - 22:00", updated: "2026.03.30", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: false, leashRequired: true, indoorAllowed: false, outdoorAllowed: true, confidence: "확실", reportCount: 0, rawText: "야외석(테라스)에 한해 반려동물 동반 가능, 목줄 필수" },
  { id: "f", name: "시설F", category: "레포츠", type: "대형견 놀이터", region: "경기", address: "경기 양평군 어딘가로 100", hours: "매일 09:00 - 19:00", updated: "2026.02.18", allowedSizes: ["대형"], weightLimitKg: null, cageRequired: false, leashRequired: false, indoorAllowed: false, outdoorAllowed: true, confidence: "추정", reportCount: 3, rawText: "목줄 해제 자유 활동 가능 구역, 대형견 위주 이용" },
  { id: "g", name: "시설G", category: "문화시설", type: "반려동반 갤러리", region: "서울", address: "서울 종로구 어딘가길 9", hours: "매일 10:00 - 18:00", updated: "2026.05.02", allowedSizes: ["소형", "중형"], weightLimitKg: 12, cageRequired: true, leashRequired: true, indoorAllowed: true, outdoorAllowed: false, confidence: "확실", reportCount: 0, rawText: "12kg 이하, 이동장 또는 유모차 이용 시 실내 관람 가능" },
  { id: "h", name: "시설H", category: "축제/행사", type: "반려동반 마켓", region: "경기", address: "경기 고양시 어딘가로 55", hours: "주말 11:00 - 17:00", updated: "2026.04.28", allowedSizes: ["소형", "중형", "대형"], weightLimitKg: null, cageRequired: false, leashRequired: true, indoorAllowed: false, outdoorAllowed: true, confidence: "추정", reportCount: 0, rawText: "행사장 전체 야외 진행, 목줄 착용 시 견종 제한 없이 입장" },
];

// TODO(Task 15): 관광공사 반려동반 여행정보 API 연동 시 아래 두 함수 내부만
// apiFetch<Facility[]>("/facilities") / apiFetch<Facility>(`/facilities/${id}`) 로 교체한다.
export async function fetchFacilities(): Promise<Facility[]> {
  return MOCK_FACILITIES;
}

export async function fetchFacilityById(id: string): Promise<Facility | undefined> {
  return MOCK_FACILITIES.find((f) => f.id === id);
}
