/**
 * 12시간제 시간(1~12)과 AM/PM 단서를 24시간제 숫자(0~23)로 변환합니다.
 */
export function toHour24(hour: number, ampm: 'AM' | 'PM'): number {
  return ampm === 'AM' ? hour % 12 : (hour % 12) + 12;
}
