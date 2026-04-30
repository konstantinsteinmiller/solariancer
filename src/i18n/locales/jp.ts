// Global locale messages — see ./en.ts for the canonical key list and
// the lazy-loading rationale.
export default {
  'gameName': 'Solariancer',
  'crazyGamesOnly': 'このゲームは次のサイトでのみ利用可能です:',
  'cancel': 'キャンセル',
  'stage': 'ステージ',
  'battlePass': {
    'battlePass': 'バトルパス',
    'complete': '完了',
    'max': 'MAX',
    'battlePassComplete': 'バトルパス達成 — お見事！',
    'rewardsReady': '{n} 個の報酬を受け取れます！',
    'xpHint': 'ステージ進行ごとに+{stage}xp · {threshold}+コンボごとに+{combo}xp',
    'seasonReset': 'シーズンリセットまであと{n}日 — 報酬を受け取ろう！'
  },
  'tutorial': {
    'intro': {
      'meet': { 'title': '太陽', 'body': 'このゲームは、太陽のオレンジ色のリングで宇宙の岩を調理します。デモを見て！' },
      'falloff': {
        'title': '指＝磁石',
        'body': '画面に触れると光る点が指を追い、小惑星を引き寄せます。近いほど強く引っ張ります。'
      },
      'pullIn': {
        'title': 'リングへ引き込む',
        'body': '岩の近くを押して、太陽の周りの明るいリングへドラッグ。離さないで！'
      },
      'steer': {
        'title': '回し続けよう',
        'body': 'リング内では、岩の周りで指を「円を描くように」動かします。止めると太陽が生のまま食べちゃう！'
      },
      'feed': { 'title': '金色を待て', 'body': '岩が金色に輝けばRIPE（熟した）。太陽へ落として大量得点！' },
      'finale': { 'title': 'もう太陽シェフ！', 'body': '同時に3つ以上のリング滞在で得点×3。宇宙を煮込もう！' }
    },
    'advanced': {
      'crowd': {
        'title': '群衆ボーナス ×3',
        'body': 'リング内に3体以上同時にいると、すべての熱量チックが3倍。重ねるとお得。'
      },
      'combo': {
        'title': 'チェインコンボ',
        'body': '熟した天体を5秒以内に投入してCOMBOゲージを伸ばそう — ×2、その後×3。'
      },
      'hotEdge': {
        'title': 'ホットエッジ＝高速調理',
        'body': '太陽すぐそばの岩は30%速く熟成 — でも一歩間違えば落下。ハイリスク・ハイリターン。'
      },
      'events': {
        'title': 'イベント＝報酬',
        'body': '彗星をキャッチし、ブラックホールを耐え抜き、フレアに乗ろう。すべてのイベントがボーナス熱量や星屑になります。'
      }
    },
    'canvas': {
      'sun': '太陽',
      'cookRing': 'リング',
      'hotEdge': 'ホットエッジ',
      'pullClose': '近い＝強い',
      'pullFar': '遠い＝弱い',
      'dragHere': 'リングへ',
      'circleIt': '岩の周りを回せ',
      'feedSun': '太陽へ落とせ！',
      'ripeNow': '熟した！',
      'cookFast': '速く調理',
      'cookSlow': '遅く調理',
      'tapToPlay': 'タップ＆ドラッグ'
    },
    'tap': 'タップで続ける',
    'click': 'クリックで続ける',
    'tapStart': 'タップで開始',
    'clickStart': 'クリックで開始',
    'skip': 'スキップ'
  },
  'game': {
    'hud': {
      'stage': 'ステージ',
      'heat': '熱量',
      'starMatter': '星屑',
      'inZone': 'リング内',
      'session': 'セッション',
      'streak': '連続記録',
      'ripe': '熟した',
      'combo': 'コンボ',
      'mission': 'ミッション',
      'puzzle': 'パズル',
      'solarFlare': 'ソーラーフレア',
      'flareIncoming': 'フレア接近',
      'chain': 'チェイン',
      'rank': 'ランク',
      'sessionTip': 'このセッションの累計熱量（リロードでリセット）',
      'days': '日'
    },
    'starter': {
      'title': 'クッキングリングで調理',
      'body': '岩をリングへドラッグ → 金色に光るのを待つ → 太陽に落として大量の熱量'
    },
    'modal': {
      'missionComplete': 'ミッション達成',
      'chooseReward': '報酬を選ぼう',
      'upgradesTitle': 'アップグレード',
      'replayTutorial': 'チュートリアルを再生',
      'achievements': '実績',
      'close': '閉じる',
      'cancel': 'キャンセル',
      'confirm': '確定',
      'max': 'MAX',
      'levelShort': 'Lv'
    },
    'supernovaModal': {
      'newClass': '★ ソーラークラス {n}',
      'reset': '熱量・ステージ・すべてのアップグレードをリセット。星屑・連続記録・解放分は保持。',
      'newBonusPrefix': '新しい永続ボーナス:',
      'newBonusValue': '+{pct}% 全熱量'
    },
    'mission': {
      'reward': {
        'heat': { 'title': '+1000 熱量', 'description': '即時の熱量注入。' },
        'matter': { 'title': '+5 ✦ 星屑', 'description': 'コズミック・フォージのために蓄積。' },
        'boost': { 'title': '×2 熱量 60秒', 'description': 'すべての報酬が2倍。' },
        'combo': { 'title': '×3 コンボ 30秒', 'description': 'チェインを飛ばして直接×3。' },
        'ripe': { 'title': '一斉に熟成', 'description': 'リング内のすべての岩が即座に熟す。' }
      }
    },
    'puzzle': {
      'crowd': { 'title': '群衆マスター', 'description': 'リング内で群衆×3を5秒継続' },
      'comet': { 'title': '彗星ハンター', 'description': '彗星を2つキャッチ' },
      'solo': { 'title': 'ソロサバイバー', 'description': '引き寄せなしでブラックホールを生き延びる' },
      'flare': { 'title': 'ヒートウェーブ', 'description': 'ソーラーフレア中に800熱量を稼ぐ' },
      'chain': { 'title': 'チェインマスター', 'description': '×3コンボに到達（5回連続熟成）' },
      'ripe3': { 'title': 'トリプルスター', 'description': '同時に3つ熟した状態' },
      'sprint': { 'title': 'フォージスプリント', 'description': 'ウィンドウ内で1500熱量を稼ぐ' },
      'pristine': { 'title': '無傷', 'description': '45秒間引き寄せなし' },
      'progress': {
        'ripe': '熟した',
        'peak': '最高',
        'survived': '生存 — 触れず！',
        'survivedHit': '生存（触れた）',
        'inEvent': 'イベント中…',
        'awaitingBH': 'BH待機',
        'broken': '失敗',
        'left': '残り',
        'flameOn': '🔥',
        'waiting': '(待機)'
      }
    },
    'upgrade': {
      'noLevels': 'ステーションなし — 購入で有効化',
      'singularityCore': { 'title': '特異点コア', 'description': 'タッチ重力の強さを増加。' },
      'fusionStabilizer': {
        'title': '核融合スタビライザー',
        'description': 'リングティック＋太陽報酬。∞レベル — 15ごとに減衰（1× → ¼× → ⅛×）。'
      },
      'attractionRadius': { 'title': '共鳴フィールド', 'description': '特異点の重力範囲を拡大。' },
      'automationProbe': {
        'title': 'テザーステーション',
        'description': '低速軌道ステーション — 通過する小惑星を捕らえ、軌道を回り熟成後、太陽へ発射（コンボチェイン）。'
      },
      'heatShield': { 'title': 'リング拡張', 'description': '太陽周りのリングを広げる — 操縦の余裕。' },
      'orbitalCapacity': { 'title': '質量マグネット', 'description': '小惑星が近くの惑星に吸着、混雑を減らす。' },
      'surfaceTension': { 'title': '表面張力', 'description': '太陽から跳ね返る — 熟した惑星を事故から守る。' },
      'cosmicForge': {
        'title': 'コズミック・フォージ ✦',
        'description': '宇宙級。星屑で支払い。すべての熱量報酬を増加 — 核融合と重なる。'
      },
      'bigProbeStation': {
        'title': 'ビッグ・プローブ ✦',
        'description': '高級テザードローン。小惑星と中型惑星を捕獲し熟して発射。最大2。'
      }
    },
    'solar': {
      'class': 'ソーラークラス',
      'rankReady': 'スーパーノヴァ準備完了 — プレステージで永続マルチプライヤー。',
      'rankNotReady': 'プレステージには累計熱量{n}が必要。',
      'allHeatBonus': '+{pct}% 全熱量',
      'supernova': 'スーパーノヴァ',
      'supernovaConfirm': 'スーパーノヴァを起こしますか？',
      'supernovaYes': 'はい、プレステージ',
      'supernovaNo': 'キャンセル',
      'locked': 'ロック中'
    },
    'stageType': {
      'gType': 'G型',
      'kType': 'K型',
      'mType': 'M型',
      'redGiant': '赤色巨星',
      'blueDwarf': '青色矮星',
      'whiteDwarf': '白色矮星',
      'brownDwarf': '褐色矮星',
      'neutron': '中性子星'
    },
    'popup': {
      'wasted': '無駄',
      'bounce': 'バウンス',
      'launched': '発射！',
      'comet': '彗星！',
      'cometCaught': '彗星！+{n}',
      'shatter': '粉砕！',
      'stage': 'ステージ {n}！',
      'matterGain': '+✦ 星屑',
      'bpXp': '+{n} BP XP',
      'comboMult': 'コンボ ×{n}！',
      'blackHole': 'ブラックホール！',
      'survived': '生還！+{n}',
      'collapsed': '崩壊',
      'solarFlare': 'ソーラーフレア！',
      'flareIncoming': 'フレア接近…',
      'puzzleSolved': 'パズル: {title}！'
    },
    'achievement': {
      'unlockedCount': '{n} / {total} 達成',
      'tutorial_graduate': { 'title': '輝かしい始まり', 'description': 'チュートリアルを完了。' },
      'first_light': { 'title': 'ファーストライト', 'description': '初の熟した天体を太陽へ投入。' },
      'stage_5': { 'title': '星の試練', 'description': 'ステージ5に到達。' },
      'stage_10': { 'title': '星のベテラン', 'description': 'ステージ10に到達。' },
      'stage_25': { 'title': '銀河の征服者', 'description': 'ステージ25に到達。' },
      'heat_1m': { 'title': '星の大富豪', 'description': '累計熱量1,000,000を獲得。' },
      'heat_100m': { 'title': '宇宙の大富豪', 'description': '累計熱量100,000,000を獲得。' },
      'comet_first': { 'title': '彗星ハンター', 'description': '初めての彗星をキャッチ。' },
      'comet_25': { 'title': '彗星のベテラン', 'description': '彗星を25個キャッチ。' },
      'comet_100': { 'title': '彗星マスター', 'description': '彗星を100個キャッチ。' },
      'bh_first': { 'title': 'ブラックホール生還者', 'description': '初のブラックホールイベントを生き延びる。' },
      'bh_25': { 'title': '事象の地平線マスター', 'description': 'ブラックホールイベントを25回生き延びる。' },
      'combo_5': { 'title': '燃焼中', 'description': 'コンボチェイン5に到達。' },
      'combo_10': { 'title': 'インフェルノ', 'description': 'コンボチェイン10に到達。' },
      'ripe_100': { 'title': '太陽のささやき', 'description': '熟した天体を100個太陽へ投入。' },
      'streak_3': { 'title': '毎日継続', 'description': '3日連続フィードを達成。' },
      'streak_30': { 'title': '星座の信徒', 'description': '30日連続フィードを達成。' },
      'first_supernova': { 'title': 'スーパーノヴァ', 'description': '一度プレステージ — ソーラークラス1。' },
      'solar_class_5': { 'title': 'パルサーマインド', 'description': 'ソーラークラス5に到達。' },
      'cosmic_forge_max': { 'title': 'フォージマスター', 'description': 'コズミック・フォージを最大強化。' },
      'big_probe': { 'title': 'ビッグアイアン', 'description': 'ビッグ・プローブを購入。' },
      'all_skins': { 'title': '星の画廊', 'description': '太陽スキン8種類を全解放。' },
      'mission_first': { 'title': 'ミッション達成', 'description': '最初の3分ミッションを完了。' }
    }
  }
}
