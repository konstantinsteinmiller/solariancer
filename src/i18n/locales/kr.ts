// Global locale messages — see ./en.ts for the canonical key list and
// the lazy-loading rationale.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': '이 게임은 다음에서만 이용할 수 있습니다:',
  'cancel': '취소',
  'stage': '스테이지',
  'battlePass': {
    'battlePass': '배틀 패스',
    'complete': '완료',
    'max': 'MAX',
    'battlePassComplete': '배틀 패스 완료 — 멋져요!',
    'rewardsReady': '받을 수 있는 보상이 {n} 개 있습니다!',
    'xpHint': '스테이지 진행당 +{stage}xp · {threshold}+ 콤보당 +{combo}xp',
    'seasonReset': '시즌 리셋까지 {n}일 — 보상을 받으세요!'
  },
  'tutorial': {
    'intro': {
      'meet': { 'title': '태양', 'body': '이 게임은 태양의 주황색 링에서 우주 돌을 익히는 게임입니다. 데모를 보세요!' },
      'falloff': { 'title': '손가락 = 자석', 'body': '화면을 누르면 빛나는 점이 손가락을 따라옵니다. 소행성을 끌어당겨요. 가까울수록 강함!' },
      'pullIn': { 'title': '안으로 끌어당겨라', 'body': '돌 근처를 누르고 태양 주위의 밝은 링 안으로 드래그하세요. 떼지 마세요!' },
      'steer': { 'title': '계속 돌려라', 'body': '링 안에서는 손가락을 돌 주위로 「원을 그리듯이」 움직이세요. 멈추면 태양이 날로 먹어버립니다!' },
      'feed': { 'title': '금빛을 기다려라', 'body': '돌이 금빛으로 빛나면 RIPE(익음). 태양에 떨어뜨려 큰 점수를 얻어요!' },
      'finale': { 'title': '당신은 태양 셰프!', 'body': '동시에 3개 이상이 링을 돌면 점수 ×3. 우주를 요리하자!' }
    },
    'advanced': {
      'crowd': { 'title': '군집 ×3', 'body': '쿠킹 링에 3+ 천체가 동시에 있으면 모든 열량 틱이 3배가 됩니다. 쌓으면 이득.' },
      'combo': { 'title': '체인 콤보', 'body': '익은 천체를 5초 안에 연속 투입해 COMBO 게이지를 올리세요 — ×2, 그다음 ×3.' },
      'hotEdge': { 'title': '핫 에지 = 빠른 조리', 'body': '태양 바로 옆 돌은 30% 더 빨리 익습니다 — 한 번 미끄러지면 빠집니다. 위험하고 짭짤.' },
      'events': { 'title': '이벤트 = 보상', 'body': '혜성을 잡고, 블랙홀을 견디고, 플레어를 타세요. 모든 이벤트가 보너스 열량이나 별 물질입니다.' }
    },
    'canvas': {
      'sun': '태양',
      'cookRing': '쿠킹 링',
      'hotEdge': '핫 에지',
      'pullClose': '가까움 = 강함',
      'pullFar': '멀리 = 약함',
      'dragHere': '링 안으로',
      'circleIt': '돌 주위로 회전',
      'feedSun': '태양으로!',
      'ripeNow': '익음!',
      'cookFast': '빠른 조리',
      'cookSlow': '느린 조리',
      'tapToPlay': '터치 & 드래그'
    },
    'tap': '탭하여 계속',
    'click': '클릭하여 계속',
    'tapStart': '탭하여 시작',
    'clickStart': '클릭하여 시작',
    'skip': '건너뛰기'
  },
  'game': {
    'hud': {
      'stage': '스테이지',
      'heat': '열량',
      'starMatter': '별 물질',
      'inZone': '링 안',
      'session': '세션',
      'streak': '연속',
      'ripe': '익음',
      'combo': '콤보',
      'mission': '미션',
      'puzzle': '퍼즐',
      'solarFlare': '솔라 플레어',
      'flareIncoming': '플레어 임박',
      'chain': '체인',
      'rank': '랭크',
      'sessionTip': '이 세션의 누적 열량 (새로고침 시 리셋)',
      'days': '일'
    },
    'starter': {
      'title': '쿠킹 링에서 요리',
      'body': '돌을 링으로 드래그 → 금색으로 빛날 때까지 대기 → 태양에 떨어뜨려 큰 열량 획득'
    },
    'modal': {
      'missionComplete': '미션 완료',
      'chooseReward': '보상을 선택하세요',
      'upgradesTitle': '업그레이드',
      'replayTutorial': '튜토리얼 다시 보기',
      'achievements': '도전 과제',
      'close': '닫기',
      'cancel': '취소',
      'confirm': '확인',
      'max': 'MAX',
      'levelShort': 'Lv'
    },
    'supernovaModal': {
      'newClass': '★ 솔라 클래스 {n}',
      'reset': '열량·스테이지·모든 업그레이드를 리셋. 별 물질·연속 기록·해금은 유지.',
      'newBonusPrefix': '새 영구 보너스:',
      'newBonusValue': '+{pct}% 전체 열량'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 열량', 'description': '즉시 열량 주입.' },
        'matter': { 'title': '+5 ✦ 별 물질', 'description': '코스믹 포지를 위해 적립.' },
        'boost': { 'title': '×2 열량 60초', 'description': '모든 보상이 두 배.' },
        'combo': { 'title': '×3 콤보 30초', 'description': '체인을 건너뛰고 바로 ×3.' },
        'ripe': { 'title': '전부 익히기', 'description': '링 안의 모든 돌이 즉시 익음.' }
      }
    },
    'puzzle': {
      'crowd': { 'title': '군중 마스터', 'description': '링에서 군중 ×3을 5초 유지' },
      'comet': { 'title': '혜성 사냥꾼', 'description': '혜성 2개 잡기' },
      'solo': { 'title': '솔로 생존자', 'description': '풀 없이 블랙홀 살아남기' },
      'flare': { 'title': '히트 웨이브', 'description': '솔라 플레어 중 열량 800 획득' },
      'chain': { 'title': '체인 마스터', 'description': '×3 콤보 도달 (연속 5번)' },
      'ripe3': { 'title': '트리플 스타', 'description': '동시에 3개 익은 상태' },
      'sprint': { 'title': '포지 스프린트', 'description': '윈도우 내에서 열량 1500 획득' },
      'pristine': { 'title': '무결', 'description': '45초 동안 풀 사용 안 함' },
      'progress': {
        'ripe': '익음',
        'peak': '최고',
        'survived': '생존 — 만지지 않음!',
        'survivedHit': '생존 (만짐)',
        'inEvent': '이벤트 중…',
        'awaitingBH': 'BH 대기',
        'broken': '실패',
        'left': '남음',
        'flameOn': '🔥',
        'waiting': '(대기)'
      }
    },
    'upgrade': {
      'noLevels': '스테이션 없음 — 구매하여 활성화',
      'singularityCore': { 'title': '특이점 코어', 'description': '터치 중력의 강도 증가.' },
      'fusionStabilizer': { 'title': '핵융합 안정기', 'description': '링 틱 + 태양 보상. ∞ 레벨 — 15마다 둔화 (1× → ¼× → ⅛×).' },
      'attractionRadius': { 'title': '공명 필드', 'description': '특이점의 중력 범위 확대.' },
      'automationProbe': { 'title': '테더 스테이션', 'description': '저속 궤도 스테이션 — 지나가는 소행성을 잡아 익혀 태양으로 발사 (콤보 체인).' },
      'heatShield': { 'title': '링 확장', 'description': '태양 주위 링을 넓혀 — 조작 여유 증가.' },
      'orbitalCapacity': { 'title': '질량 자석', 'description': '소행성이 가까운 행성에 흡착되어 혼잡 감소.' },
      'surfaceTension': { 'title': '표면장력', 'description': '태양에 부딪쳐도 튕겨 — 익은 행성을 사고에서 보호.' },
      'cosmicForge': { 'title': '코스믹 포지 ✦', 'description': '코스믹 등급. 별 물질로 지불. 모든 열량 수익을 증가 — 핵융합과 중첩.' },
      'bigProbeStation': { 'title': '빅 프로브 스테이션 ✦', 'description': '고급 테더 드론. 소행성과 중형 행성을 잡아 익혀 발사. 최대 2개.' }
    },
    'solar': {
      'class': '솔라 클래스',
      'rankReady': '슈퍼노바 준비 완료 — 프레스티지로 영구 배수기 획득.',
      'rankNotReady': '프레스티지하려면 누적 열량 {n} 필요.',
      'allHeatBonus': '+{pct}% 전체 열량',
      'supernova': '슈퍼노바',
      'supernovaConfirm': '슈퍼노바를 시작할까요?',
      'supernovaYes': '네, 프레스티지',
      'supernovaNo': '취소',
      'locked': '잠김'
    },
    'stageType': {
      'gType': 'G형',
      'kType': 'K형',
      'mType': 'M형',
      'redGiant': '적색거성',
      'blueDwarf': '청색왜성',
      'whiteDwarf': '백색왜성',
      'brownDwarf': '갈색왜성',
      'neutron': '중성자별'
    },
    'popup': {
      'wasted': '낭비',
      'bounce': '반동',
      'launched': '발사!',
      'comet': '혜성!',
      'cometCaught': '혜성! +{n}',
      'shatter': '파쇄!',
      'stage': '스테이지 {n}!',
      'matterGain': '+✦ 별 물질',
      'bpXp': '+{n} BP XP',
      'comboMult': '콤보 ×{n}!',
      'blackHole': '블랙홀!',
      'survived': '생존! +{n}',
      'collapsed': '붕괴',
      'solarFlare': '솔라 플레어!',
      'flareIncoming': '플레어 임박…',
      'puzzleSolved': '퍼즐: {title}!'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} 달성',
      'tutorial_graduate': { 'title': '밝은 시작', 'description': '튜토리얼을 완료.' },
      'first_light': { 'title': '첫 빛', 'description': '첫 익은 천체를 태양에 투입.' },
      'stage_5': { 'title': '별의 시험', 'description': '스테이지 5 도달.' },
      'stage_10': { 'title': '항성 베테랑', 'description': '스테이지 10 도달.' },
      'stage_25': { 'title': '은하 정복자', 'description': '스테이지 25 도달.' },
      'heat_1m': { 'title': '항성 거물', 'description': '누적 열량 1,000,000 획득.' },
      'heat_100m': { 'title': '우주의 거물', 'description': '누적 열량 100,000,000 획득.' },
      'comet_first': { 'title': '혜성 사냥꾼', 'description': '첫 혜성을 잡음.' },
      'comet_25': { 'title': '혜성 베테랑', 'description': '혜성 25개 잡기.' },
      'comet_100': { 'title': '혜성 마스터', 'description': '혜성 100개 잡기.' },
      'bh_first': { 'title': '블랙홀 생존자', 'description': '첫 블랙홀 이벤트 생존.' },
      'bh_25': { 'title': '이벤트 호라이즌 마스터', 'description': '블랙홀 이벤트 25번 생존.' },
      'combo_5': { 'title': '불타는 중', 'description': '콤보 체인 5 도달.' },
      'combo_10': { 'title': '인페르노', 'description': '콤보 체인 10 도달.' },
      'ripe_100': { 'title': '태양의 속삭임', 'description': '익은 천체 100개를 태양에 투입.' },
      'streak_3': { 'title': '매일매일', 'description': '3일 연속 피드 달성.' },
      'streak_30': { 'title': '별자리 신도', 'description': '30일 연속 피드 달성.' },
      'first_supernova': { 'title': '슈퍼노바', 'description': '한 번 프레스티지 — 솔라 클래스 1.' },
      'solar_class_5': { 'title': '펄사 마인드', 'description': '솔라 클래스 5 도달.' },
      'cosmic_forge_max': { 'title': '포지 마스터', 'description': '코스믹 포지를 최대 강화.' },
      'big_probe': { 'title': '빅 아이언', 'description': '빅 프로브 스테이션 구매.' },
      'all_skins': { 'title': '별의 갤러리', 'description': '태양 스킨 8종 전부 해금.' },
      'mission_first': { 'title': '미션 달성', 'description': '첫 3분 미션 완료.' }
    }
  }
}
