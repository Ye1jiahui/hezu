import { describe, expect, it } from 'vitest'
import { createDemoData } from './data'
import { calculateBalances, calculateSettlements, splitEqually } from './utils'

describe('AA 分摊', () => {
  it('等分后总额不因小数误差改变', () => {
    const result = splitEqually(100, ['a', 'b', 'c'])
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100)
    expect(result).toEqual({ a: 33.34, b: 33.33, c: 33.33 })
  })

  it('所有成员净余额之和为零', () => {
    const data = createDemoData()
    const balances = calculateBalances(data.members, data.expenses)
    expect(Object.values(balances).reduce((sum, value) => sum + value, 0)).toBeCloseTo(0)
  })

  it('转账建议能够清偿全部未结费用', () => {
    const data = createDemoData()
    const settlements = calculateSettlements(data.members, data.expenses)
    const total = settlements.reduce((sum, item) => sum + item.amount, 0)
    const balances = calculateBalances(data.members, data.expenses)
    const debt = Object.values(balances).filter((value) => value < 0).reduce((sum, value) => sum - value, 0)
    expect(total).toBeCloseTo(debt)
  })
})
