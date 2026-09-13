// Prisma의 BigInt 필드(User.id, Pet.id/userId 등)는 JSON.stringify가 기본적으로
// 직렬화하지 못한다("Do not know how to serialize a BigInt"). 지금까지는 매 컨트롤러에서
// 손으로 .toString()을 했지만, Prisma entity를 직접 리턴하는 다음 도메인부터는 그 방식이
// 깨진다 — 전역으로 한 번 고쳐둔다.
(BigInt.prototype as unknown as { toJSON(): string }).toJSON = function (
  this: bigint,
): string {
  return this.toString();
};
