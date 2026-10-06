export type Departure = 'admit' | 'reject' | null;
export const ARRIVAL_SECONDS = 2.8;
export const DEPARTURE_SECONDS = 4.8;
// The gate is at x=-5. Rejection stays on its outside (x > -5).
export function departurePosition(kind:Exclude<Departure,null>,elapsed:number):[number,number] {
  const t=Math.min(1,Math.max(0,elapsed/DEPARTURE_SECONDS));
  return kind==='reject'?[8*t,-6]:[-9*t,-6];
}
