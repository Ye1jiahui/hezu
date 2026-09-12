import type { AppData } from './types'

const iso = (offset: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export const createDemoData = (): AppData => ({
  version: 1,
  members: [
    { id: 'm1', name: '林夏', initials: '夏', color: '#c6e0fb' },
    { id: 'm2', name: '阿哲', initials: '哲', color: '#b3bf86' },
    { id: 'm3', name: '小满', initials: '满', color: '#e3c6c2' },
    { id: 'm4', name: '可可', initials: '可', color: '#cfa362' },
  ],
  expenses: [
    {
      id: 'e1', title: '九月房租', amount: 6800, payerId: 'm2', participantIds: ['m1', 'm2', 'm3', 'm4'],
      shares: { m1: 1700, m2: 1700, m3: 1700, m4: 1700 }, category: '房租', date: iso(-8), settled: false,
    },
    {
      id: 'e2', title: '水电燃气', amount: 386.4, payerId: 'm1', participantIds: ['m1', 'm2', 'm3', 'm4'],
      shares: { m1: 96.6, m2: 96.6, m3: 96.6, m4: 96.6 }, category: '水电', date: iso(-4), settled: false,
    },
    {
      id: 'e3', title: '周末火锅食材', amount: 248, payerId: 'm3', participantIds: ['m1', 'm2', 'm3'],
      shares: { m1: 82.67, m2: 82.67, m3: 82.66 }, category: '聚餐', date: iso(-2), settled: false,
    },
    {
      id: 'e4', title: '宽带年费', amount: 960, payerId: 'm4', participantIds: ['m1', 'm2', 'm3', 'm4'],
      shares: { m1: 240, m2: 240, m3: 240, m4: 240 }, category: '网络', date: iso(-18), settled: true,
    },
  ],
  chores: [
    { id: 'c1', title: '厨房台面与灶台', area: '厨房', assigneeId: 'm1', dueDate: iso(0), done: false },
    { id: 'c2', title: '客厅吸尘与整理', area: '客厅', assigneeId: 'm2', dueDate: iso(1), done: true },
    { id: 'c3', title: '卫生间深度清洁', area: '卫生间', assigneeId: 'm3', dueDate: iso(2), done: false },
    { id: 'c4', title: '垃圾分类与投放', area: '全屋', assigneeId: 'm4', dueDate: iso(3), done: false },
  ],
  supplies: [
    { id: 's1', name: '抽纸', category: '日用品', quantity: 2, unit: '包', threshold: 3, targetQuantity: 12, buyerId: 'm4', updatedAt: iso(-1) },
    { id: 's2', name: '洗洁精', category: '厨房', quantity: 1, unit: '瓶', threshold: 1, targetQuantity: 3, buyerId: 'm2', updatedAt: iso(-3) },
    { id: 's3', name: '垃圾袋', category: '清洁', quantity: 18, unit: '只', threshold: 10, targetQuantity: 30, buyerId: 'm1', updatedAt: iso(-2) },
    { id: 's4', name: '洗衣液', category: '清洁', quantity: 3, unit: '瓶', threshold: 1, targetQuantity: 4, buyerId: 'm3', updatedAt: iso(-5) },
  ],
  supplyLogs: [
    { id: 'sl1', supplyId: 's1', change: -1, memberId: 'm3', date: iso(-1), note: '客厅补了一包' },
    { id: 'sl2', supplyId: 's3', change: -2, memberId: 'm1', date: iso(-2), note: '日常使用' },
  ],
  pacts: [
    { id: 'p1', title: '安静时间', content: '工作日 23:00 后降低音量，视频会议尽量使用耳机。', category: '作息', agreedBy: ['m1', 'm2', 'm3', 'm4'], updatedAt: iso(-12) },
    { id: 'p2', title: '访客提前说', content: '留宿访客至少提前一天在群里说明，连续留宿不超过两晚。', category: '访客', agreedBy: ['m1', 'm2', 'm3'], updatedAt: iso(-3) },
    { id: 'p3', title: '公共支出上限', content: '单笔超过 200 元的公共采购，需至少三位室友同意。', category: '费用', agreedBy: ['m1', 'm2'], updatedAt: iso(-1) },
  ],
  activities: [
    { id: 'a1', text: '小满记录了周末火锅食材 ¥248', time: '2 小时前', tone: 'pink' },
    { id: 'a2', text: '阿哲完成了客厅吸尘与整理', time: '昨天 20:34', tone: 'green' },
    { id: 'a3', text: '抽纸只剩 2 包，记得补货', time: '昨天 09:12', tone: 'gold' },
    { id: 'a4', text: '可可确认了「访客提前说」', time: '周一 22:08', tone: 'blue' },
  ],
})
