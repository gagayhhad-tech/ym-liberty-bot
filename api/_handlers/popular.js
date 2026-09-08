// Curated list of iconic uncensored tracks confirmed in YM Liberty DB
const STATIC_POPULAR_TRACKS = [
  {
    id: "152973936",
    title: "Monday",
    artists: "ROCKET",
    durationMs: 168880,
    coverUri: "https://avatars.yandex.net/get-music-content/20322863/61ba37c2.a.42778355-1/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "153116884",
    title: "Инкассатор",
    artists: "ROCKET",
    durationMs: 165370,
    coverUri: "https://avatars.yandex.net/get-music-content/17649213/197a9416.a.42837594-1/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "24442524",
    title: "Моряк",
    artists: "Агата Кристи",
    durationMs: 215440,
    coverUri: "https://avatars.yandex.net/get-music-content/17655650/39dc32dc.a.2849406-1/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "25738208",
    title: "Выдох-вдох",
    artists: "GUF",
    durationMs: 170130,
    coverUri: "https://avatars.yandex.net/get-music-content/42108/9c4d8789.a.3043667-1/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "25168288",
    title: "Уровни",
    artists: "ЛСП",
    durationMs: 236210,
    coverUri: "https://avatars.yandex.net/get-music-content/5282321/f1b045c0.a.17439799-1/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "21220262",
    title: "Радуга",
    artists: "Anacondaz, RasKar",
    durationMs: 207370,
    coverUri: "https://avatars.yandex.net/get-music-content/15682289/d2ad7f2a.a.479579-5/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "21287099",
    title: "Не учи меня как жить",
    artists: "Anacondaz, Тони Вечер",
    durationMs: 173710,
    coverUri: "https://avatars.yandex.net/get-music-content/16154377/7c85103a.a.5913573-4/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "25319594",
    title: "Мама, я люблю",
    artists: "Anacondaz",
    durationMs: 224890,
    coverUri: "https://avatars.yandex.net/get-music-content/15317937/82221d90.a.2982824-4/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "17198411",
    title: "Наркоман",
    artists: "Сектор Газа",
    durationMs: 217960,
    coverUri: "https://avatars.yandex.net/get-music-content/28589/e24b2353.a.1892834-1/400x400",
    isLiberty: true,
    explicit: true,
  },
  {
    id: "17198343",
    title: "Опять сегодня",
    artists: "Сектор Газа",
    durationMs: 142220,
    coverUri: "https://avatars.yandex.net/get-music-content/28589/e24b2353.a.1892834-1/400x400",
    isLiberty: true,
    explicit: true,
  },
];

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({ tracks: STATIC_POPULAR_TRACKS });
};
