// TourAPI detailIntro2는 contentTypeId별로 필드 이름이 다르다(예: 이용시간이 usetime/
// usetimeculture/usetimeleports 등으로 갈라짐). 화면은 타입별로 분기하지 않고, 알려진
// 필드 중 실제로 값이 있는 것만 이 순서대로 보여준다.
export const INTRO_FIELD_LABELS: Record<string, string> = {
  usetime: "이용시간",
  usetimeculture: "이용시간",
  usetimeleports: "이용시간",
  usetimefestival: "이용시간",
  usetimeperformance: "공연시간",
  opentimefood: "영업시간",
  checkintime: "체크인",
  checkouttime: "체크아웃",
  restdate: "휴무일",
  restdateculture: "휴무일",
  restdateleports: "휴무일",
  restdatefood: "휴무일",
  parking: "주차",
  parkingculture: "주차",
  parkingleports: "주차",
  parkingfood: "주차",
  infocenter: "문의처",
  infocenterculture: "문의처",
  infocenterleports: "문의처",
  infocenterlodging: "문의처",
};

export const INTRO_FIELD_ORDER = [
  "usetime",
  "usetimeculture",
  "usetimeleports",
  "usetimefestival",
  "usetimeperformance",
  "opentimefood",
  "checkintime",
  "checkouttime",
  "restdate",
  "restdateculture",
  "restdateleports",
  "restdatefood",
  "parking",
  "parkingculture",
  "parkingleports",
  "parkingfood",
  "infocenter",
  "infocenterculture",
  "infocenterleports",
  "infocenterlodging",
];

export const INTRO_SOURCE_LABEL: Record<"cache" | "live" | "synced", string> = {
  cache: "캐시",
  live: "실시간",
  synced: "배치 동기화",
};
