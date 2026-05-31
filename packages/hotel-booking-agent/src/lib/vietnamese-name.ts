/** Tách họ / tên cho form Booking VN: Họ = họ đệm, Tên = tên riêng (từ cuối). */
export function splitVietnameseName(fullName: string): { familyName: string; givenName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { familyName: "", givenName: "" };
  if (parts.length === 1) return { familyName: parts[0]!, givenName: parts[0]! };
  return {
    familyName: parts.slice(0, -1).join(" "),
    givenName: parts[parts.length - 1]!,
  };
}
