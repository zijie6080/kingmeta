// ==========================================
// Static hero seed data (from pvp.mcxssg.net)
// Used for initial DB population + crawler reference
// ==========================================

export interface SeedHero {
  id: string
  name: string
  alias?: string
  roles: string[]
  difficulty: number
}

// Comprehensive hero list based on the site
export const SEED_HEROES: SeedHero[] = [
  { id: '508', name: '敖隐', roles: ['发育路'], difficulty: 2 },
  { id: '199', name: '少司缘', roles: ['游走'], difficulty: 2 },
  { id: '189', name: '海月', roles: ['中路'], difficulty: 3 },
  { id: '177', name: '马超', roles: ['打野', '对抗路'], difficulty: 2 },
  { id: '168', name: '哪吒', roles: ['对抗路', '打野'], difficulty: 2 },
  { id: '163', name: '盾山', roles: ['游走'], difficulty: 2 },
  { id: '175', name: '裴擒虎', roles: ['打野'], difficulty: 2 },
  { id: '151', name: '沈梦溪', roles: ['中路'], difficulty: 1 },
  { id: '510', name: '元流之子(射手)', alias: '元流之子', roles: ['发育路'], difficulty: 3 },
  { id: '157', name: '元歌', roles: ['对抗路'], difficulty: 2 },
  { id: '174', name: '镜', roles: ['打野'], difficulty: 3 },
  { id: '507', name: '心魔六耳', roles: ['对抗路', '打野'], difficulty: 3 },
  { id: '141', name: '大乔', roles: ['游走', '中路'], difficulty: 1 },
  { id: '506', name: '扁鹊', roles: ['中路'], difficulty: 2 },
  { id: '109', name: '女娲', roles: ['中路'], difficulty: 2 },
  { id: '152', name: '刘邦', roles: ['游走'], difficulty: 2 },
  { id: '509', name: '蚩奼', roles: ['发育路', '对抗路'], difficulty: 3 },
  { id: '124', name: '张飞', roles: ['游走'], difficulty: 1 },
  { id: '196', name: '司空震', roles: ['对抗路', '发育路'], difficulty: 2 },
  { id: '167', name: '嫦娥', roles: ['中路'], difficulty: 2 },
  { id: '166', name: '苏烈', roles: ['游走'], difficulty: 2 },
  { id: '186', name: '大禹', roles: ['游走'], difficulty: 2 },
  { id: '145', name: '宫本武藏', roles: ['打野'], difficulty: 2 },
  { id: '191', name: '公孙离', roles: ['发育路'], difficulty: 2 },
  { id: '511', name: '元流之子(辅助)', alias: '元流之子', roles: ['游走'], difficulty: 3 },
  { id: '126', name: '孙权', roles: ['发育路'], difficulty: 1 },
  { id: '115', name: '百里守约', roles: ['发育路'], difficulty: 3 },
  { id: '505', name: '影', roles: ['对抗路', '打野'], difficulty: 3 },
  { id: '190', name: '戈娅', roles: ['发育路'], difficulty: 2 },
  { id: '192', name: '狂铁', roles: ['对抗路'], difficulty: 2 },
  { id: '129', name: '关羽', roles: ['对抗路'], difficulty: 2 },
  { id: '195', name: '老夫子', alias: '老夫子', roles: ['对抗路'], difficulty: 2 },
  { id: '194', name: '空空儿', roles: ['游走'], difficulty: 3 },
  { id: '136', name: '诸葛亮', roles: ['中路', '打野'], difficulty: 2 },
  { id: '137', name: '铠', roles: ['打野'], difficulty: 2 },
  { id: '148', name: '杨玉环', roles: ['中路', '游走'], difficulty: 2 },
  { id: '121', name: '甄姬', roles: ['中路'], difficulty: 2 },
  { id: '183', name: '李信', roles: ['发育路'], difficulty: 2 },
  { id: '123', name: '虞姬', roles: ['发育路'], difficulty: 1 },
  { id: '170', name: '孙悟空', roles: ['打野'], difficulty: 3 },
  { id: '146', name: '暃', roles: ['打野'], difficulty: 3 },
  { id: '111', name: '小乔', roles: ['中路'], difficulty: 2 },
  { id: '149', name: '不知火舞', roles: ['中路'], difficulty: 2 },
  { id: '169', name: '百里玄策', roles: ['打野'], difficulty: 3 },
  { id: '184', name: '艾琳', roles: ['发育路'], difficulty: 2 },
  { id: '187', name: '蒙恬', roles: ['对抗路'], difficulty: 2 },
  { id: '176', name: '太乙真人', roles: ['游走'], difficulty: 1 },
  { id: '128', name: '曹操', roles: ['对抗路', '打野'], difficulty: 2 },
  { id: '107', name: '韩信', roles: ['打野'], difficulty: 3 },
  { id: '174', name: '武则天', roles: ['中路'], difficulty: 2 },
  { id: '132', name: '张良', roles: ['游走', '中路'], difficulty: 2 },
  { id: '180', name: '阿古朵', roles: ['打野', '发育路'], difficulty: 2 },
  { id: '153', name: '杨戬', roles: ['对抗路', '打野'], difficulty: 2 },
  { id: '140', name: '墨子', roles: ['游走'], difficulty: 1 },
  { id: '188', name: '云缨', roles: ['打野'], difficulty: 2 },
  { id: '158', name: '狄仁杰', roles: ['发育路'], difficulty: 1 },
  { id: '197', name: '赵怀真', roles: ['游走', '对抗路'], difficulty: 3 },
  { id: '164', name: '赵云', roles: ['打野'], difficulty: 1 },
  { id: '155', name: '西施', roles: ['中路'], difficulty: 2 },
  { id: '120', name: '后羿', roles: ['发育路'], difficulty: 1 },
  { id: '117', name: '貂蝉', roles: ['中路'], difficulty: 2 },
  { id: '193', name: '白起', roles: ['对抗路'], difficulty: 2 },
  { id: '198', name: '苍', roles: ['发育路'], difficulty: 3 },
  { id: '113', name: '廉颇', roles: ['游走'], difficulty: 1 },
  { id: '185', name: '夏洛特', roles: ['对抗路'], difficulty: 2 },
  { id: '116', name: '孙尚香', roles: ['发育路'], difficulty: 2 },
  { id: '173', name: '高渐离', roles: ['中路'], difficulty: 3 },
  { id: '130', name: '花木兰', roles: ['对抗路'], difficulty: 2 },
  { id: '181', name: '大司命', roles: ['打野', '对抗路'], difficulty: 3 },
  { id: '182', name: '海诺', roles: ['中路'], difficulty: 3 },
  { id: '161', name: '瑶', roles: ['游走'], difficulty: 1 },
  { id: '159', name: '芈月', roles: ['对抗路'], difficulty: 2 },
  { id: '178', name: '上官婉儿', roles: ['中路'], difficulty: 2 },
  { id: '160', name: '典韦', roles: ['打野'], difficulty: 2 },
  { id: '143', name: '弈星', roles: ['中路'], difficulty: 3 },
  { id: '200', name: '桑启', roles: ['游走'], difficulty: 3 },
  { id: '162', name: '姬小满', roles: ['对抗路'], difficulty: 2 },
  { id: '165', name: '橘右京', roles: ['打野'], difficulty: 3 },
  { id: '119', name: '鲁班大师', roles: ['游走'], difficulty: 2 },
  { id: '134', name: '干将莫邪', roles: ['中路'], difficulty: 2 },
  { id: '154', name: '露娜', roles: ['打野'], difficulty: 2 },
  { id: '201', name: '莱西奥', roles: ['发育路'], difficulty: 2 },
  { id: '171', name: '猪八戒', roles: ['对抗路', '打野'], difficulty: 2 },
  { id: '122', name: '亚瑟', roles: ['对抗路'], difficulty: 1 },
  { id: '112', name: '达摩', roles: ['对抗路'], difficulty: 1 },
  { id: '127', name: '鲁班七号', roles: ['发育路'], difficulty: 1 },
  { id: '138', name: '朵莉亚', roles: ['游走'], difficulty: 2 },
  { id: '144', name: '钟馗', roles: ['游走'], difficulty: 2 },
  { id: '131', name: '项羽', roles: ['对抗路', '游走'], difficulty: 2 },
  { id: '139', name: '司马懿', roles: ['打野'], difficulty: 2 },
  { id: '150', name: '雅典娜', roles: ['打野'], difficulty: 2 },
  { id: '135', name: '孙策', roles: ['对抗路'], difficulty: 2 },
  { id: '103', name: '安琪拉', roles: ['中路'], difficulty: 1 },
  { id: '512', name: '元流之子(刺客)', alias: '元流之子', roles: ['打野'], difficulty: 3 },
  { id: '156', name: '李元芳', roles: ['发育路', '打野'], difficulty: 2 },
  { id: '104', name: '李白', roles: ['打野'], difficulty: 2 },
  { id: '172', name: '鬼谷子', roles: ['游走'], difficulty: 3 },
  { id: '179', name: '盘古', roles: ['打野', '对抗路'], difficulty: 3 },
  { id: '142', name: '梦奇', roles: ['打野', '对抗路'], difficulty: 2 },
  { id: '108', name: '吕布', roles: ['对抗路'], difficulty: 2 },
  { id: '147', name: '澜', roles: ['打野'], difficulty: 3 },
  { id: '118', name: '曜', roles: ['打野'], difficulty: 2 },
  { id: '133', name: '刘禅', roles: ['游走'], difficulty: 2 },
]

// Role label map
export const ROLE_LABELS: Record<string, string> = {
  '全部分路': '全部',
  '对抗路': '对抗路',
  '打野': '打野',
  '中路': '中路',
  '发育路': '发育路',
  '游走': '游走',
}

// Role icon map (lucide)
export const ROLE_ICONS: Record<string, string> = {
  '对抗路': '🗡️',
  '打野': '🌲',
  '中路': '⚡',
  '发育路': '🏹',
  '游走': '🌀',
}

// Avatar URL builder (using pvp.qq.com CDN)
export function heroAvatarUrl(heroId: string): string {
  return `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${heroId}/${heroId}.jpg`
}
