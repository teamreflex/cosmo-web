type SynonymList = {
  units: string[];
  members: string[];
};

export const members: Record<string, string[]> = {
  // short names
  hj: ["heejin"],
  hs: ["haseul"],
  kl: ["kimlip"],
  js: ["jinsoul"],
  ch: ["choerry"],
  // S-numbers
  s1: ["seoyeon"],
  s2: ["hyerin"],
  s3: ["jiwoo"],
  s4: ["chaeyeon"],
  s5: ["yooyeon"],
  s6: ["soomin"],
  s7: ["nakyoung"],
  s8: ["yubin"],
  s9: ["kaede"],
  s10: ["dahyun"],
  s11: ["kotone"],
  s12: ["yeonji"],
  s13: ["nien"],
  s14: ["sohyun"],
  s15: ["xinyu"],
  s16: ["mayu"],
  s17: ["lynn"],
  s18: ["joobin"],
  s19: ["hayeon"],
  s20: ["shion"],
  s21: ["chaewon"],
  s22: ["sullin"],
  s23: ["seoah"],
  s24: ["jiyeon"],
  // nicknames
  soda: ["dahyun"],
};

export const units: Record<string, SynonymList> = {
  "odd-eye-circle": {
    units: ["oec", "oddeyecircle", "odd eye circle"],
    members: ["KimLip", "JinSoul", "Choerry"],
  },
  "acid-angel": {
    units: ["acid angel from asia", "aaa"],
    members: ["HyeRin", "YooYeon", "NakYoung", "YuBin"],
  },
  "krystal-eyes": {
    units: ["krystal eyes", "kre"],
    members: ["SeoYeon", "JiWoo", "ChaeYeon", "SooMin"],
  },
  "acid-eyes": {
    units: ["acid eyes"],
    members: [
      "SeoYeon",
      "HyeRin",
      "JiWoo",
      "ChaeYeon",
      "YooYeon",
      "SooMin",
      "NaKyoung",
      "YuBin",
    ],
  },
  lovelution: {
    units: ["lovelution"],
    members: [
      "SeoYeon",
      "HyeRin",
      "YuBin",
      "Kaede",
      "DaHyun",
      "Nien",
      "SoHyun",
      "Xinyu",
    ],
  },
  evolution: {
    units: ["EVOLution"],
    members: [
      "JiWoo",
      "ChaeYeon",
      "YooYeon",
      "SooMin",
      "NaKyoung",
      "Kotone",
      "YeonJi",
      "Mayu",
    ],
  },
  nxt: {
    units: ["NXT"],
    members: ["Lynn", "JooBin", "HaYeon", "ShiOn"],
  },
  aria: {
    units: ["Aria"],
    members: ["JiWoo", "ChaeYeon", "Kaede", "DaHyun", "Nien"],
  },
  glow: {
    units: ["Glow"],
    members: ["ChaeWon", "Sullin", "SeoAh", "JiYeon"],
  },
  "visionary-vision": {
    units: ["Visionary Vision", "vv"],
    members: [
      "HyeRin",
      "YooYeon",
      "NaKyoung",
      "YuBin",
      "Kaede",
      "Kotone",
      "YeonJi",
      "Nien",
      "SoHyun",
      "Xinyu",
      "Lynn",
      "JiYeon",
    ],
  },
  hatch: {
    units: ["∞", "hatch", "jp"],
    members: [
      "JiWoo",
      "ChaeYeon",
      "SooMin",
      "YooYeon",
      "Kotone",
      "Mayu",
      "ShiOn",
      "ChaeWon",
    ],
  },
  alphie: {
    units: ["Alphie"],
    members: [
      "YooYeon",
      "Nien",
      "JiYeon",
      "Kotone",
      "ShiOn",
      "Lynn",
      "ChaeWon",
      "HaYeon",
    ],
  },
  moon: {
    units: ["moon"],
    members: ["Kaede", "SoHyun", "Lynn", "ShiOn", "Sullin", "JiYeon"],
  },
  sun: {
    units: ["sun"],
    members: ["HyeRin", "ChaeYeon", "YooYeon", "Xinyu", "Mayu", "ChaeWon"],
  },
  neptune: {
    units: ["neptune"],
    members: ["SeoYeon", "NaKyoung", "DaHyun", "Kotone", "Nien", "SeoAh"],
  },
  zenith: {
    units: ["zenith"],
    members: ["JiWoo", "SooMin", "YuBin", "YeonJi", "JooBin", "HaYeon"],
  },
};

export const classes: Record<string, string[]> = {
  fco: ["First"],
  sco: ["Special"],
  dco: ["Double"],
  wco: ["Welcome"],
  zco: ["Zero"],
  pco: ["Premier"],
  bco: ["Basic"],
  eco: ["Event"],
};

export const misc: Record<string, string[]> = {
  oma: ["objekt music album"],
};
