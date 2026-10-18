/** Curated editorial photography (Unsplash). Rendered through next/image with a monogram fallback. */
export function unsplash(id: string, width = 1200): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=78`;
}

export const IMG = {
  hero: "1560066984-138dadb4c035",
  categories: {
    hair: "1522337360788-8b13dee7a37e",
    nails: "1604654894610-df63bc536371",
    lashes: "1583001931096-959e9a1a6223",
    brows: "1588528402605-1f9d0eb7a6d0",
    makeup: "1487412947147-5cebf100ffc2",
    skincare: "1570172619644-dfd03ed5d881",
    barber: "1503951914875-452162b0f3f1",
    spa: "1544161515-4ab6ce6db874",
    aesthetic: "1512290923902-8a9f81dc236c",
  },
  interiors: [
    "1560066984-138dadb4c035",
    "1521590832167-7bcbfaa6381f",
    "1600948836101-f9ffda59d250",
    "1633681926022-84c23e8cb2d6",
    "1516975080664-ed2fc6a32937",
    "1562322140-8baeececf3df",
    "1595476108010-b4d1f102b1b1",
    "1585747860715-2ba37e788b70",
    "1599351431202-1e0f0137899a",
    "1540555700478-4be289fbecef",
    "1610992015732-2449b76344bc",
    "1519699047748-de8e457a634e",
    "1512496015851-a90fb38ba796",
    "1596462502278-27bfdc403348",
  ],
  portraitsF: [
    "1494790108377-be9c29b29330",
    "1438761681033-6461ffad8d80",
    "1544005313-94ddf0286df2",
    "1534528741775-53994a69daeb",
    "1517841905240-472988babdf9",
    "1529626455594-4ff0802cfb7e",
    "1524504388940-b1c1722653e1",
    "1573496359142-b8d87734a5a2",
    "1508214751196-bcfd4ca60f91",
    "1531123897727-8f129e1688ce",
    "1488426862026-3ee34a7d66df",
  ],
  portraitsM: [
    "1507003211169-0a1dd7228f2d",
    "1500648767791-00dcc994a43e",
    "1506794778202-cad84cf45f1d",
  ],
};
