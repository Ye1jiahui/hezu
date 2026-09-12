export type Member = {
  id: string
  name: string
  initials: string
  color: string
}

export type Expense = {
  id: string
  title: string
  amount: number
  payerId: string
  participantIds: string[]
  shares: Record<string, number>
  category: string
  date: string
  settled: boolean
}

export type Settlement = {
  fromId: string
  toId: string
  amount: number
}

export type Chore = {
  id: string
  title: string
  area: string
  assigneeId: string
  dueDate: string
  done: boolean
}

export type Supply = {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  threshold: number
  targetQuantity: number
  buyerId: string
  updatedAt: string
}

export type SupplyLog = {
  id: string
  supplyId: string
  change: number
  memberId: string
  date: string
  note: string
}

export type PactClause = {
  id: string
  title: string
  content: string
  category: string
  agreedBy: string[]
  updatedAt: string
}

export type Activity = {
  id: string
  text: string
  time: string
  tone: 'blue' | 'green' | 'pink' | 'gold'
}

export type AppData = {
  version: 1
  members: Member[]
  expenses: Expense[]
  chores: Chore[]
  supplies: Supply[]
  supplyLogs: SupplyLog[]
  pacts: PactClause[]
  activities: Activity[]
}
