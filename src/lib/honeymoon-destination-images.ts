/**
 * [CL-MAP-WORLDCUP-FIX-20260330] 100개 여행지 Unsplash 이미지 매핑
 * [CL-WORLDCUP-CONNECT-20260330] 깨진 URL 15개 교체 + 중복 2쌍 해소
 * 월드컵 토너먼트 카드에서 모든 도시에 사진을 표시하기 위한 데이터
 */

export const DESTINATION_IMAGES: Record<string, { url: string; thumbUrl: string }> = {
  // ── 기존 WORLD_CUP_IMAGES 8개 ──
  'maldives': {
    url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=100&q=40',
  },
  'bali': {
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&q=40',
  },
  'europe': {
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&q=40',
  },
  'hawaii': {
    url: 'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=100&q=40',
  },
  'cancun': {
    url: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=100&q=40',
  },
  // [CL-REMOVE-KR-DESTINATIONS-20260403-210000] 제주 이미지 제거

  // ── 동남아 ──
  'phuket': {
    url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=100&q=40',
  },
  'danang': {
    url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=100&q=40',
  },
  'boracay': {
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&q=40',
  },
  'cebu': {
    url: 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=100&q=40',
  },
  'koh-samui': {
    url: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=100&q=40',
  },
  'singapore': {
    url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=100&q=40',
  },
  'bangkok': {
    url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=100&q=40',
  },
  'chiang-mai': {
    url: 'https://images.unsplash.com/photo-1598935898639-81586f7d2129?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1598935898639-81586f7d2129?w=100&q=40',
  },
  'hoi-an': {
    url: 'https://images.unsplash.com/photo-1540611025311-01df3cef54b5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1540611025311-01df3cef54b5?w=100&q=40',
  },
  'langkawi': {
    url: 'https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=100&q=40',
  },
  'kota-kinabalu': {
    url: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1573455494060-c5595004fb6c?w=100&q=40',
  },
  'nha-trang': {
    url: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=100&q=40',
  },
  'palawan': {
    url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=100&q=40',
  },
  'lombok': {
    url: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=100&q=40',
  },
  'siem-reap': {
    url: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=100&q=40',
  },
  'luang-prabang': {
    url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=100&q=40',
  },
  'bintan': {
    url: 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=100&q=40',
  },
  'phi-phi': {
    url: 'https://images.unsplash.com/photo-1548181464-36c3e0e0f03b?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1548181464-36c3e0e0f03b?w=100&q=40',
  },
  'coron': {
    url: 'https://images.unsplash.com/photo-1553603227-2358aabe821e?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1553603227-2358aabe821e?w=100&q=40',
  },
  'koh-tao': {
    url: 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=100&q=40',
  },
  'hanoi': {
    url: 'https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=100&q=40',
  },
  'hua-hin': {
    url: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=100&q=40',
  },

  // ── 동아시아 ──
  'okinawa': {
    url: 'https://images.unsplash.com/photo-1590253230532-a67f6bc61c9e?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1590253230532-a67f6bc61c9e?w=100&q=40',
  },
  'tokyo': {
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&q=40',
  },
  'kyoto': {
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=100&q=40',
  },
  'hokkaido': {
    url: 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?w=100&q=40',
  },
  'osaka': {
    url: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=100&q=40',
  },
  'fukuoka': {
    url: 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=100&q=40',
  },
  'miyako-jima': {
    url: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=100&q=40',
  },
  'taipei': {
    url: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=100&q=40',
  },
  'hong-kong': {
    url: 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=100&q=40',
  },
  'macau': {
    url: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=100&q=40',
  },
  'karuizawa': {
    url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=100&q=40',
  },
  'ishigaki': {
    url: 'https://images.unsplash.com/photo-1583244685026-d8519b5e3d21?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1583244685026-d8519b5e3d21?w=100&q=40',
  },

  // ── 남아시아/인도양 ──
  'mauritius': {
    url: 'https://images.unsplash.com/photo-1589979481223-deb893043163?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1589979481223-deb893043163?w=100&q=40',
  },
  'seychelles': {
    url: 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=100&q=40',
  },
  'sri-lanka': {
    url: 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1588416936097-41850ab3d86d?w=100&q=40',
  },
  'goa': {
    url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=100&q=40',
  },

  // ── 유럽 (개별 도시) ──
  'paris': {
    url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=100&q=40',
  },
  'rome': {
    url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=100&q=40',
  },
  'barcelona': {
    url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=100&q=40',
  },
  'santorini': {
    url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=100&q=40',
  },
  'prague': {
    url: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=100&q=40',
  },
  'london': {
    url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=100&q=40',
  },
  'interlaken': {
    url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=100&q=40',
  },
  'dubrovnik': {
    url: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555990793-da11153b2473?w=100&q=40',
  },
  'lisbon': {
    url: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=100&q=40',
  },
  'amalfi': {
    url: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=100&q=40',
  },
  'nice': {
    url: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1491166617655-0723a0999cfc?w=100&q=40',
  },
  'florence': {
    url: 'https://images.unsplash.com/photo-1543429258-1a30f1c1b4f5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1543429258-1a30f1c1b4f5?w=100&q=40',
  },
  'vienna': {
    url: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=100&q=40',
  },
  'budapest': {
    url: 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=100&q=40',
  },
  'iceland': {
    url: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=100&q=40',
  },
  'istanbul': {
    url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=100&q=40',
  },
  'mykonos': {
    url: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=100&q=40',
  },
  'porto': {
    url: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=100&q=40',
  },
  'malta': {
    url: 'https://images.unsplash.com/photo-1561412612-8226e66e7fea?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1561412612-8226e66e7fea?w=100&q=40',
  },
  'cinque-terre': {
    url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=100&q=40',
  },
  'split': {
    url: 'https://images.unsplash.com/photo-1555990538-1e7b9733871b?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555990538-1e7b9733871b?w=100&q=40',
  },
  'hallstatt': {
    url: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=100&q=40',
  },
  'edinburgh': {
    url: 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=100&q=40',
  },
  'norway': {
    url: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=100&q=40',
  },
  'montenegro': {
    url: 'https://images.unsplash.com/photo-1586523969643-c946e6f3be03?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1586523969643-c946e6f3be03?w=100&q=40',
  },

  // ── 북미 ──
  'new-york': {
    url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=100&q=40',
  },
  'los-angeles': {
    url: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=100&q=40',
  },
  'miami': {
    url: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=100&q=40',
  },
  'vancouver': {
    url: 'https://images.unsplash.com/photo-1559511260-66a68e7e4112?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1559511260-66a68e7e4112?w=100&q=40',
  },

  // ── 중남미/카리브 ──
  'cuba': {
    url: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=100&q=40',
  },
  'costa-rica': {
    url: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=100&q=40',
  },
  'peru': {
    url: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=100&q=40',
  },
  'jamaica': {
    url: 'https://images.unsplash.com/photo-1570071677470-1f9a56e414ff?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1570071677470-1f9a56e414ff?w=100&q=40',
  },

  // ── 오세아니아/태평양 ──
  'guam': {
    url: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=100&q=40',
  },
  'saipan': {
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=100&q=40',
  },
  'fiji': {
    url: 'https://images.unsplash.com/photo-1475066392170-59d55d96fe51?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1475066392170-59d55d96fe51?w=100&q=40',
  },
  'tahiti': {
    url: 'https://images.unsplash.com/photo-1589197331516-4d84b72ebde3?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1589197331516-4d84b72ebde3?w=100&q=40',
  },
  'palau': {
    url: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=100&q=40',
  },
  'sydney': {
    url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=100&q=40',
  },
  'gold-coast': {
    url: 'https://images.unsplash.com/photo-1528072164453-f4e8ef0d475a?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1528072164453-f4e8ef0d475a?w=100&q=40',
  },
  'new-zealand': {
    url: 'https://images.unsplash.com/photo-1469521669194-babb45599def?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1469521669194-babb45599def?w=100&q=40',
  },
  'cairns': {
    url: 'https://images.unsplash.com/photo-1523916330348-c67c2d3e2664?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1523916330348-c67c2d3e2664?w=100&q=40',
  },
  'bora-bora': {
    url: 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=100&q=40',
  },
  'whitsundays': {
    url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=100&q=40',
  },

  // ── 중동/아프리카 ──
  'dubai': {
    url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=100&q=40',
  },
  'morocco': {
    url: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=100&q=40',
  },
  'zanzibar': {
    url: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?w=100&q=40',
  },
  'cappadocia': {
    url: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=100&q=40',
  },
  'cape-town': {
    url: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=100&q=40',
  },
  'oman': {
    url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=100&q=40',
  },
  'abu-dhabi': {
    url: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=100&q=40',
  },

  // [CL-REMOVE-KR-DESTINATIONS-20260403-210000] 국내 5개 이미지 제거
};
