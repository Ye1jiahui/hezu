import type { Expense, Member, Settlement } from './types'

export const money = (value: number) =>
  new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

export const calculateBalances = (members: Member[], expenses: Expense[]) => {
  const cents = Object.fromEntries(members.map((member) => [member.id, 0])) as Record<string, number>
  expenses.filter((expense) => !expense.settled).forEach((expense) => {
    cents[expense.payerId] += Math.round(expense.amount * 100)
    expense.participantIds.forEach((id) => {
      cents[id] -= Math.round((expense.shares[id] ?? 0) * 100)
    })
  })
  return Object.fromEntries(Object.entries(cents).map(([id, value]) => [id, value / 100])) as Record<string, number>
}

export const calculateSettlements = (members: Member[], expenses: Expense[]): Settlement[] => {
  const balances = calculateBalances(members, expenses)
  const debtors = Object.entries(balances)
    .filter(([, value]) => value < -0.009)
    .map(([id, value]) => ({ id, cents: Math.round(-value * 100) }))
    .sort((a, b) => b.cents - a.cents)
  const creditors = Object.entries(balances)
    .filter(([, value]) => value > 0.009)
    .map(([id, value]) => ({ id, cents: Math.round(value * 100) }))
    .sort((a, b) => b.cents - a.cents)

  const result: Settlement[] = []
  let debtorIndex = 0
  let creditorIndex = 0
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(debtor.cents, creditor.cents)
    result.push({ fromId: debtor.id, toId: creditor.id, amount: amount / 100 })
    debtor.cents -= amount
    creditor.cents -= amount
    if (debtor.cents === 0) debtorIndex += 1
    if (creditor.cents === 0) creditorIndex += 1
  }
  return result
}

export const splitEqually = (amount: number, memberIds: string[]) => {
  if (!memberIds.length) return {}
  const totalCents = Math.round(amount * 100)
  const base = Math.floor(totalCents / memberIds.length)
  let remainder = totalCents - base * memberIds.length
  return Object.fromEntries(memberIds.map((id) => {
    const value = base + (remainder-- > 0 ? 1 : 0)
    return [id, value / 100]
  }))
}

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`))

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
