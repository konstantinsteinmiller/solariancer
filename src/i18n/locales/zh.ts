// Global locale messages — see ./en.ts for the canonical key list and
// the lazy-loading rationale.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': '本游戏仅在以下平台提供：',
  'cancel': '取消',
  'stage': '关卡',
  'battlePass': {
    'battlePass': '战斗通行证',
    'complete': '完成',
    'max': '满级',
    'battlePassComplete': '战斗通行证已完成 — 干得漂亮！',
    'rewardsReady': '你有 {n} 个奖励可以领取！',
    'xpHint': '每关推进 +{stage} xp · 每{threshold}+连击 +{combo} xp',
    'seasonReset': '赛季将在{n}天后重置 — 快领取奖励！'
  },
  'tutorial': {
    'intro': {
      'meet': { 'title': '太阳', 'body': '游戏目标：在太阳的橙色烹饪环里把太空岩石煮熟。看演示！' },
      'falloff': { 'title': '手指 = 磁铁', 'body': '触摸屏幕，发光点会跟随你的手指吸引小行星。越近吸力越强！' },
      'pullIn': { 'title': '拉进环里', 'body': '在岩石附近按住，然后把它拖入太阳周围明亮的橙色环里。别松手！' },
      'steer': { 'title': '保持转动', 'body': '进入环内后，把手指在岩石周围画圈。一旦停下，太阳就把它生吞了！' },
      'feed': { 'title': '等它变金', 'body': '继续转动，直到岩石发出金光 — 它熟了！把它扔进太阳获得高分！' },
      'finale': { 'title': '你是太阳大厨！', 'body': '同时3+个岩石在环里 = ×3 积分。煮沸整个宇宙吧！' }
    },
    'advanced': {
      'crowd': { 'title': '聚众 ×3', 'body': '同时有3+岩石绕烹饪环时，每次热量都翻三倍。叠加最划算。' },
      'combo': { 'title': '连锁连击', 'body': '在5秒内连续投入成熟岩石来积累COMBO — ×2，再 ×3。' },
      'hotEdge': {
        'title': '炽热边 = 极速烹饪',
        'body': '紧贴太阳的岩石熟得快30% — 但稍一失手就会掉进去。高风险，高收益。'
      },
      'events': { 'title': '事件 = 奖励', 'body': '抓彗星，扛住黑洞，乘骑日耀。每个事件都是额外的热量或星辰物质。' }
    },
    'canvas': {
      'sun': '太阳',
      'cookRing': '烹饪环',
      'hotEdge': '炽热边',
      'pullClose': '近 = 强',
      'pullFar': '远 = 弱',
      'dragHere': '拉入环',
      'circleIt': '绕岩石转',
      'feedSun': '扔进太阳！',
      'ripeNow': '熟了！',
      'cookFast': '快速烹饪',
      'cookSlow': '缓慢烹饪',
      'tapToPlay': '点按并拖动'
    },
    'tap': '点击继续',
    'click': '点击继续',
    'tapStart': '点击开始',
    'clickStart': '点击开始',
    'skip': '跳过'
  },
  'game': {
    'hud': {
      'stage': '关卡',
      'heat': '热量',
      'starMatter': '星辰物质',
      'inZone': '环内',
      'session': '本场',
      'streak': '连击',
      'ripe': '熟',
      'combo': '连招',
      'mission': '任务',
      'puzzle': '谜题',
      'solarFlare': '太阳耀斑',
      'flareIncoming': '耀斑临近',
      'chain': '链',
      'rank': '段位',
      'sessionTip': '本场会话累计热量（重载重置）',
      'days': '天'
    },
    'starter': {
      'title': '在烹饪环中烹饪',
      'body': '把岩石拖入发光的环 · 等到它们发金光 · 把熟岩石扔进太阳获得大量热量'
    },
    'modal': {
      'missionComplete': '任务完成',
      'chooseReward': '选择奖励',
      'upgradesTitle': '升级',
      'replayTutorial': '重新播放教程',
      'achievements': '成就',
      'close': '关闭',
      'cancel': '取消',
      'confirm': '确认',
      'max': '满级',
      'levelShort': 'Lv'
    },
    'supernovaModal': {
      'newClass': '★ 太阳级别 {n}',
      'reset': '重置热量、关卡、全部升级。保留星辰物质、连击记录与所有解锁。',
      'newBonusPrefix': '新的永久奖励：',
      'newBonusValue': '+{pct}% 全部热量'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 热量', 'description': '立即注入热量。' },
        'matter': { 'title': '+5 ✦ 星辰物质', 'description': '为宇宙熔炉积累。' },
        'boost': { 'title': '×2 热量 60秒', 'description': '所有奖励翻倍。' },
        'combo': { 'title': '×3 连招 30秒', 'description': '跳过链 — 直接到 ×3。' },
        'ripe': { 'title': '全部成熟', 'description': '环内所有岩石立即成熟。' }
      }
    },
    'puzzle': {
      'crowd': { 'title': '聚众大师', 'description': '环内保持 ×3 聚众 5 秒' },
      'comet': { 'title': '彗星猎手', 'description': '抓住 2 颗彗星' },
      'solo': { 'title': '独行者', 'description': '不使用引力幸存黑洞' },
      'flare': { 'title': '热浪', 'description': '太阳耀斑期间获得 800 热量' },
      'chain': { 'title': '链式大师', 'description': '达到 ×3 连招（连续 5 次成熟）' },
      'ripe3': { 'title': '三重星', 'description': '同时存在 3 个熟岩石' },
      'sprint': { 'title': '熔炉冲刺', 'description': '窗口期内获得 1500 热量' },
      'pristine': { 'title': '完美', 'description': '45秒内不使用引力' },
      'progress': {
        'ripe': '熟',
        'peak': '峰值',
        'survived': '幸存 — 未触碰！',
        'survivedHit': '幸存（触碰）',
        'inEvent': '事件中…',
        'awaitingBH': '等待黑洞',
        'broken': '失败',
        'left': '剩余',
        'flameOn': '🔥',
        'waiting': '（等待）'
      }
    },
    'upgrade': {
      'noLevels': '无站点 — 购买以启用',
      'singularityCore': { 'title': '奇点核心', 'description': '增强触摸引力强度。' },
      'fusionStabilizer': {
        'title': '聚变稳定器',
        'description': '环刻度 + 太阳奖励。∞ 级 — 每15级减半 (1× → ¼× → ⅛×)。'
      },
      'attractionRadius': { 'title': '共振场', 'description': '扩大奇点的引力范围。' },
      'automationProbe': {
        'title': '系绳站',
        'description': '低速轨道站 — 抓住经过的小行星，绕轨成熟后发射至太阳（连击）。'
      },
      'heatShield': { 'title': '环扩展', 'description': '加宽太阳周围的环 — 操作余地更大。' },
      'orbitalCapacity': { 'title': '质量磁石', 'description': '小行星吸附到最近的行星，减少混乱。' },
      'surfaceTension': { 'title': '表面张力', 'description': '岩石在被吞噬前会从太阳上反弹 — 保护熟岩石。' },
      'cosmicForge': { 'title': '宇宙熔炉 ✦', 'description': '宇宙级。用星辰物质支付。所有热量乘数 — 与聚变叠加。' },
      'bigProbeStation': {
        'title': '大型探测站 ✦',
        'description': '高级系绳无人机。可抓住小行星与中型行星，成熟后发射。最多 2 个。'
      }
    },
    'solar': {
      'class': '太阳级别',
      'rankReady': '准备超新星 — 转生重置进度获得永久乘数。',
      'rankNotReady': '转生需要累计热量 {n}。',
      'allHeatBonus': '+{pct}% 全部热量',
      'supernova': '超新星',
      'supernovaConfirm': '触发超新星？',
      'supernovaYes': '是，转生',
      'supernovaNo': '取消',
      'locked': '已锁定'
    },
    'stageType': {
      'gType': 'G型',
      'kType': 'K型',
      'mType': 'M型',
      'redGiant': '红巨星',
      'blueDwarf': '蓝矮星',
      'whiteDwarf': '白矮星',
      'brownDwarf': '褐矮星',
      'neutron': '中子星'
    },
    'popup': {
      'wasted': '浪费',
      'bounce': '反弹',
      'launched': '发射！',
      'comet': '彗星！',
      'cometCaught': '彗星！+{n}',
      'shatter': '粉碎！',
      'stage': '关卡 {n}！',
      'matterGain': '+✦ 星辰物质',
      'bpXp': '+{n} BP XP',
      'comboMult': '连击 ×{n}！',
      'blackHole': '黑洞！',
      'survived': '幸存！+{n}',
      'collapsed': '坍缩',
      'solarFlare': '太阳耀斑！',
      'flareIncoming': '耀斑临近…',
      'puzzleSolved': '谜题：{title}！'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} 已解锁',
      'tutorial_graduate': { 'title': '璀璨开端', 'description': '完成新手教程。' },
      'first_light': { 'title': '第一道光', 'description': '把第一个熟岩石送入太阳。' },
      'stage_5': { 'title': '星辰之考', 'description': '到达第5关。' },
      'stage_10': { 'title': '星辰老兵', 'description': '到达第10关。' },
      'stage_25': { 'title': '银河征服者', 'description': '到达第25关。' },
      'heat_1m': { 'title': '星辰大亨', 'description': '累计获得 1,000,000 热量。' },
      'heat_100m': { 'title': '宇宙巨头', 'description': '累计获得 100,000,000 热量。' },
      'comet_first': { 'title': '彗星猎手', 'description': '抓住你的第一颗彗星。' },
      'comet_25': { 'title': '彗星老兵', 'description': '抓住25颗彗星。' },
      'comet_100': { 'title': '彗星宗师', 'description': '抓住100颗彗星。' },
      'bh_first': { 'title': '黑洞幸存者', 'description': '幸存第一次黑洞事件。' },
      'bh_25': { 'title': '事件视界宗师', 'description': '幸存25次黑洞事件。' },
      'combo_5': { 'title': '燃烧', 'description': '达到5连击。' },
      'combo_10': { 'title': '炼狱', 'description': '达到10连击。' },
      'ripe_100': { 'title': '太阳低语', 'description': '把100个熟岩石送入太阳。' },
      'streak_3': { 'title': '日日不辍', 'description': '达成3天连击。' },
      'streak_30': { 'title': '星座信徒', 'description': '达成30天连击。' },
      'first_supernova': { 'title': '超新星', 'description': '转生一次 — 太阳级别1。' },
      'solar_class_5': { 'title': '脉冲心智', 'description': '到达太阳级别5。' },
      'cosmic_forge_max': { 'title': '熔炉宗师', 'description': '把宇宙熔炉点满。' },
      'big_probe': { 'title': '重型铁器', 'description': '购买一个大型探测站。' },
      'all_skins': { 'title': '星辰画廊', 'description': '解锁全部8个太阳皮肤。' },
      'mission_first': { 'title': '任务达成', 'description': '完成第一次3分钟任务。' }
    }
  }
}
