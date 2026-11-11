type SynonymList = {
  units: string[];
  members: string[];
};

export const members = {
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
  // idntt id numbers
  id1: ["dohun"],
  id2: ["heeju"],
  id4: ["taein"],
  id5: ["jaeyoung"],
  id6: ["juho"],
  id7: ["jiwoon"],
  id8: ["hwanhee"],
  id9: ["cheongmyeong"],
  id10: ["towa"],
  id11: ["kyuhyuk"],
  id12: ["nuri"],
  id13: ["seongjun"],
  id14: ["yejoon"],
  id15: ["gyeongbeen"],
  id16: ["eunsoo"],
  id17: ["giwoong"],
  id18: ["jooheon"],
  id19: ["gyungho"],
  id20: ["eunchan"],
  id21: ["eunsung"],
  // nicknames
  soda: ["dahyun"],
};

export const units = {
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
  unevermet: {
    units: ["unevermet"],
    members: [
      "DoHun",
      "HeeJu",
      "TaeIn",
      "JaeYoung",
      "JuHo",
      "JiWoon",
      "HwanHee",
    ],
  },
  yesweare: {
    units: ["yesweare"],
    members: [
      "CheongMyeong",
      "Towa",
      "KyuHyuk",
      "NuRi",
      "SeongJun",
      "YeJoon",
      "GyeongBeen",
      "EunSoo",
    ],
  },
  itsnotover: {
    units: ["itsnotover"],
    members: ["GiWoong", "JooHeon", "GyungHo", "EunChan", "EunSung"],
  },
} satisfies Record<string, SynonymList>;

export const classes = {
  fco: ["First"],
  sco: ["Special"],
  dco: ["Double"],
  wco: ["Welcome"],
  zco: ["Zero"],
  pco: ["Premier"],
  bco: ["Basic"],
  eco: ["Event"],
  mco: ["Motion"],
  uco: ["Unit"],
};

export const misc = {
  oma: ["objekt music album"],
};
