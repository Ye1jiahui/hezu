import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Box, CalendarCheck,
  CalendarDays, Check, CheckCircle2, ChevronRight, Clock, HandCoins, History, Home,
  Minus, Package, PenLine, Plus, Receipt, RotateCcw, ScrollText, ShieldCheck,
  ShoppingBasket, Sparkles, UserRound, Users, Vote, Wallet, X,
} from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { createDemoData } from './data'
import type { AppData, Chore, Expense, Member, PactClause, Supply } from './types'
import { calculateBalances, calculateSettlements, formatDate, money, splitEqually, todayIso, uid } from './utils'

const STORAGE_KEY = 'roomie-home:v1'

const navigation = [
  { to: '/dashboard', label: '首页', longLabel: '生活总览', icon: Home },
  { to: '/expenses', label: '费用', longLabel: '费用 AA', icon: Receipt },
  { to: '/chores', label: '值日', longLabel: '清洁值日', icon: CalendarCheck },
  { to: '/supplies', label: '物品', longLabel: '公共物品', icon: Package },
  { to: '/pacts', label: '公约', longLabel: '室友公约', icon: ScrollText },
]

const loadData = (): AppData => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return createDemoData()
    const parsed = JSON.parse(stored) as AppData
    if (parsed.version !== 1 || !Array.isArray(parsed.members) || !Array.isArray(parsed.expenses)) {
      return createDemoData()
    }
    return parsed
  } catch {
    return createDemoData()
  }
}

function Avatar({ member, size = 'md' }: { member: Member; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar avatar-${size}`} style={{ backgroundColor: member.color }}>{member.initials}</span>
}

function PageHeading({ eyebrow, title, intro, action }: { eyebrow: string; title: string; intro: string; action?: ReactNode }) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {action}
    </header>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div><span className="eyebrow">这件事记下来</span><h2>{title}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭弹窗"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function ExpenseForm({ members, currentMemberId, onSave, onClose }: {
  members: Member[]; currentMemberId: string; onSave: (expense: Expense) => void; onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payerId, setPayerId] = useState(currentMemberId)
  const [category, setCategory] = useState('日常')
  const [participants, setParticipants] = useState(members.map((member) => member.id))
  const [mode, setMode] = useState<'equal' | 'custom'>('equal')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!title.trim() || numericAmount <= 0 || !participants.length) {
      setError('请填写费用名称、有效金额，并至少选择一位参与者。')
      return
    }
    const shares = mode === 'equal'
      ? splitEqually(numericAmount, participants)
      : Object.fromEntries(participants.map((id) => [id, Number(custom[id] || 0)]))
    const shareTotal = Object.values(shares).reduce((sum, value) => sum + value, 0)
    if (mode === 'custom' && Math.abs(shareTotal - numericAmount) > 0.009) {
      setError(`自定义分摊合计为 ¥${money(shareTotal)}，需与费用金额一致。`)
      return
    }
    onSave({
      id: uid('expense'), title: title.trim(), amount: numericAmount, payerId, participantIds: participants,
      shares, category, date: todayIso(), settled: false,
    })
  }

  const toggleParticipant = (id: string) => {
    setParticipants((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid two">
        <label><span>费用名称</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：超市采购" /></label>
        <label><span>金额</span><div className="money-input"><b>¥</b><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div></label>
        <label><span>付款人</span><select value={payerId} onChange={(e) => setPayerId(e.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <label><span>分类</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>日常</option><option>房租</option><option>水电</option><option>聚餐</option><option>网络</option><option>其他</option></select></label>
      </div>
      <fieldset>
        <legend>参与分摊</legend>
        <div className="member-picks">{members.map((member) => (
          <button key={member.id} type="button" className={participants.includes(member.id) ? 'member-pick selected' : 'member-pick'} onClick={() => toggleParticipant(member.id)}>
            <Avatar member={member} size="sm" /><span>{member.name}</span>{participants.includes(member.id) && <Check size={15} />}
          </button>
        ))}</div>
      </fieldset>
      <fieldset>
        <legend>分摊方式</legend>
        <div className="segmented"><button type="button" className={mode === 'equal' ? 'active' : ''} onClick={() => setMode('equal')}>平均分摊</button><button type="button" className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>自定义金额</button></div>
        {mode === 'custom' && <div className="custom-shares">{members.filter((member) => participants.includes(member.id)).map((member) => (
          <label key={member.id}><span>{member.name}</span><input type="number" min="0" step="0.01" value={custom[member.id] ?? ''} onChange={(e) => setCustom({ ...custom, [member.id]: e.target.value })} placeholder="0.00" /></label>
        ))}</div>}
      </fieldset>
      {error && <p className="form-error"><AlertTriangle size={16} />{error}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary" type="submit">保存费用</button></div>
    </form>
  )
}

function ChoreForm({ members, currentMemberId, onSave, onClose }: {
  members: Member[]; currentMemberId: string; onSave: (chore: Chore) => void; onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('客厅')
  const [assigneeId, setAssigneeId] = useState(currentMemberId)
  const [dueDate, setDueDate] = useState(todayIso())
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onSave({ id: uid('chore'), title: title.trim(), area, assigneeId, dueDate, done: false })
  }
  return <form className="form" onSubmit={submit}>
    <label><span>任务名称</span><input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：清理冰箱过期食物" /></label>
    <div className="form-grid two">
      <label><span>区域</span><select value={area} onChange={(e) => setArea(e.target.value)}><option>客厅</option><option>厨房</option><option>卫生间</option><option>阳台</option><option>全屋</option></select></label>
      <label><span>负责人</span><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label><span>截止日期</span><input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
    </div>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary">加入排班</button></div>
  </form>
}

function SupplyForm({ members, currentMemberId, onSave, onClose }: {
  members: Member[]; currentMemberId: string; onSave: (supply: Supply) => void; onClose: () => void
}) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('件')
  const [threshold, setThreshold] = useState('1')
  const [target, setTarget] = useState('5')
  const [buyerId, setBuyerId] = useState(currentMemberId)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSave({ id: uid('supply'), name: name.trim(), category: '日用品', quantity: Number(quantity), unit, threshold: Number(threshold), targetQuantity: Math.max(Number(target), Number(quantity)), buyerId, updatedAt: todayIso() })
  }
  return <form className="form" onSubmit={submit}>
    <label><span>物品名称</span><input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="如：厨房纸" /></label>
    <div className="form-grid two">
      <label><span>当前数量</span><input type="number" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
      <label><span>单位</span><input required value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      <label><span>低库存提醒</span><input type="number" min="0" required value={threshold} onChange={(e) => setThreshold(e.target.value)} /></label>
      <label><span>补货目标</span><input type="number" min="1" required value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      <label><span>采购负责人</span><select value={buyerId} onChange={(e) => setBuyerId(e.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    </div>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary">登记物品</button></div>
  </form>
}

function PactForm({ initial, onSave, onClose }: { initial?: PactClause; onSave: (pact: PactClause) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [category, setCategory] = useState(initial?.category ?? '生活')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return
    onSave({ id: initial?.id ?? uid('pact'), title: title.trim(), content: content.trim(), category, agreedBy: initial?.agreedBy ?? [], updatedAt: todayIso() })
  }
  return <form className="form" onSubmit={submit}>
    <label><span>公约标题</span><input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="一句话说明规则" /></label>
    <label><span>具体约定</span><textarea required rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="写清楚时间、范围和例外情况，减少误解。" /></label>
    <label><span>分类</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>生活</option><option>作息</option><option>访客</option><option>费用</option><option>卫生</option></select></label>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary">保存公约</button></div>
  </form>
}

function Dashboard({ data, currentMember, openModal }: { data: AppData; currentMember: Member; openModal: (name: string) => void }) {
  const navigate = useNavigate()
  const balances = calculateBalances(data.members, data.expenses)
  const myBalance = balances[currentMember.id] ?? 0
  const pendingChores = data.chores.filter((item) => !item.done)
  const lowSupplies = data.supplies.filter((item) => item.quantity <= item.threshold)
  const confirmedPacts = data.pacts.filter((pact) => pact.agreedBy.length === data.members.length)

  return <>
    <PageHeading eyebrow="周六 · 合租第 186 天" title={`嗨，${currentMember.name}`} intro="家里的大小事，今天也安排得明明白白。" action={<button className="button primary" onClick={() => openModal('expense')}><Plus size={18} />记一笔</button>} />
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow">本月合租账单</span><h2>{myBalance >= 0 ? '你暂时是房子的“小金库”' : '还有一笔账，顺手结清吧'}</h2><div className="hero-amount"><small>{myBalance >= 0 ? '待收回' : '待支付'}</small><strong>¥ {money(Math.abs(myBalance))}</strong></div><button className="text-button" onClick={() => navigate('/expenses')}>查看结算建议 <ArrowRight size={17} /></button></div>
      <div className="house-illustration" aria-hidden="true"><span className="sun" /><span className="cloud cloud-one" /><span className="cloud cloud-two" /><div className="house"><i className="roof" /><i className="wall"><b /><b /></i><i className="door" /></div><span className="shrub shrub-one" /><span className="shrub shrub-two" /></div>
    </section>
    <section className="stat-grid">
      <button className="stat-card blue" onClick={() => navigate('/chores')}><div><span>待完成值日</span><strong>{pendingChores.length}</strong><small>项任务</small></div><CalendarCheck /></button>
      <button className="stat-card gold" onClick={() => navigate('/supplies')}><div><span>需要补货</span><strong>{lowSupplies.length}</strong><small>种物品</small></div><ShoppingBasket /></button>
      <button className="stat-card pink" onClick={() => navigate('/pacts')}><div><span>已生效公约</span><strong>{confirmedPacts.length}</strong><small>/ {data.pacts.length} 条</small></div><ShieldCheck /></button>
    </section>
    <section className="dashboard-grid">
      <article className="panel">
        <div className="panel-header"><div><span className="eyebrow">本周安排</span><h2>本周值日</h2></div><button className="icon-button" onClick={() => navigate('/chores')} aria-label="查看全部值日"><ChevronRight /></button></div>
        <div className="compact-list">{data.chores.slice(0, 4).map((chore) => {
          const member = data.members.find((item) => item.id === chore.assigneeId)!
          return <div className="compact-row" key={chore.id}><span className={`status-dot ${chore.done ? 'done' : ''}`}>{chore.done && <Check size={13} />}</span><div className="grow"><b>{chore.title}</b><small>{formatDate(chore.dueDate)} · {chore.area}</small></div><Avatar member={member} size="sm" /></div>
        })}</div>
      </article>
      <article className="panel">
        <div className="panel-header"><div><span className="eyebrow">室友动态</span><h2>家里动态</h2></div><History size={19} /></div>
        <div className="activity-list">{data.activities.slice(0, 4).map((activity) => <div className="activity" key={activity.id}><span className={`activity-mark ${activity.tone}`} /><div><p>{activity.text}</p><small>{activity.time}</small></div></div>)}</div>
      </article>
    </section>
  </>
}

function ExpensesPage({ data, openModal, settleExpense }: { data: AppData; openModal: (name: string) => void; settleExpense: (id: string) => void }) {
  const balances = calculateBalances(data.members, data.expenses)
  const settlements = calculateSettlements(data.members, data.expenses)
  const member = (id: string) => data.members.find((item) => item.id === id)!
  return <>
    <PageHeading eyebrow="账目清清楚楚" title="费用 AA" intro="谁先垫、谁该付，自动算清，不让人情卡在小数点里。" action={<button className="button primary" onClick={() => openModal('expense')}><Plus size={18} />新增费用</button>} />
    <section className="balance-strip">{data.members.map((item) => <article key={item.id}><Avatar member={item} /><div><span>{item.name}</span><strong className={balances[item.id] >= 0 ? 'positive' : 'negative'}>{balances[item.id] >= 0 ? '+' : '-'}¥{money(Math.abs(balances[item.id]))}</strong><small>{balances[item.id] >= 0 ? '应收' : '应付'}</small></div></article>)}</section>
    <section className="content-grid expense-layout">
      <article className="panel">
        <div className="panel-header"><div><span className="eyebrow">共同账本</span><h2>费用明细</h2></div><span className="count-label">{data.expenses.length} 笔</span></div>
        <div className="expense-list">{data.expenses.map((expense) => <div className={`expense-row ${expense.settled ? 'muted' : ''}`} key={expense.id}>
          <span className="expense-icon"><Receipt size={19} /></span><div className="grow"><div className="row-title"><b>{expense.title}</b><span className="tag">{expense.category}</span></div><small>{formatDate(expense.date)} · {member(expense.payerId).name} 支付 · {expense.participantIds.length} 人分摊</small></div><div className="expense-price"><strong>¥{money(expense.amount)}</strong>{expense.settled ? <span className="settled"><Check size={13} />已结清</span> : <button onClick={() => settleExpense(expense.id)}>标记结清</button>}</div>
        </div>)}</div>
      </article>
      <aside className="panel settlement-panel">
        <div className="panel-header"><div><span className="eyebrow">自动合并往来</span><h2>最省事结算</h2></div><HandCoins size={20} /></div>
        <p className="panel-intro">合并往来后，只需完成以下 {settlements.length} 笔转账。</p>
        <div className="settlement-list">{settlements.length ? settlements.map((item, index) => <div className="settlement" key={`${item.fromId}-${item.toId}`}><span>{index + 1}</span><div><div className="avatar-pair"><Avatar member={member(item.fromId)} size="sm" /><ArrowRight size={15} /><Avatar member={member(item.toId)} size="sm" /></div><p><b>{member(item.fromId).name}</b> 转给 <b>{member(item.toId).name}</b></p></div><strong>¥{money(item.amount)}</strong></div>) : <div className="empty-state"><CheckCircle2 /><b>目前账目已清</b><p>没有需要处理的转账。</p></div>}</div>
      </aside>
    </section>
  </>
}

function ChoresPage({ data, openModal, toggleChore, generateWeek }: { data: AppData; openModal: (name: string) => void; toggleChore: (id: string) => void; generateWeek: () => void }) {
  const complete = data.chores.filter((item) => item.done).length
  return <>
    <PageHeading eyebrow="一人一班，轮流来" title="清洁值日" intro="不是谁看不下去谁来做，每个人都有清楚的一班。" action={<div className="heading-actions"><button className="button secondary" onClick={generateWeek}><RotateCcw size={17} />生成下周</button><button className="button primary" onClick={() => openModal('chore')}><Plus size={18} />添加任务</button></div>} />
    <section className="week-banner"><div><CalendarDays /><span>本周进度</span><strong>{complete} / {data.chores.length}</strong></div><div className="week-progress"><i style={{ width: `${data.chores.length ? complete / data.chores.length * 100 : 0}%` }} /></div><p>{complete === data.chores.length ? '本周任务全部完成，给所有人加朵小红花。' : `再完成 ${data.chores.length - complete} 项，就能整屋清爽收工。`}</p></section>
    <section className="chore-grid">{data.chores.map((chore, index) => {
      const assignee = data.members.find((item) => item.id === chore.assigneeId)!
      return <article className={`chore-card tone-${index % 4} ${chore.done ? 'completed' : ''}`} key={chore.id}><div className="chore-top"><span className="area-label">{chore.area}</span><button className="check-button" onClick={() => toggleChore(chore.id)} aria-label={chore.done ? '恢复为待完成' : '完成任务'}>{chore.done && <Check size={19} />}</button></div><div><h3>{chore.title}</h3><p><Clock size={15} />{formatDate(chore.dueDate)} 前完成</p></div><footer><div><Avatar member={assignee} size="sm" /><span>{assignee.name} 负责</span></div>{chore.done ? <b className="done-copy">已打卡</b> : <span>待完成</span>}</footer></article>
    })}</section>
  </>
}

function SuppliesPage({ data, openModal, consume, replenish }: { data: AppData; openModal: (name: string) => void; consume: (id: string) => void; replenish: (id: string) => void }) {
  const low = data.supplies.filter((item) => item.quantity <= item.threshold)
  const member = (id: string) => data.members.find((item) => item.id === id)!
  return <>
    <PageHeading eyebrow="一起用，一起记" title="公共物品" intro="用掉有记录，见底有提醒，采购不再靠某个人一直惦记。" action={<button className="button primary" onClick={() => openModal('supply')}><Plus size={18} />登记物品</button>} />
    {low.length > 0 && <section className="alert-banner"><span><Bell size={20} /></span><div><b>{low.map((item) => item.name).join('、')} 快用完了</b><p>已提醒对应采购负责人，可直接在下方标记补货。</p></div><strong>{low.length} 项待处理</strong></section>}
    <section className="supply-grid">{data.supplies.map((supply, index) => {
      const isLow = supply.quantity <= supply.threshold
      const percent = Math.min(100, Math.max(4, supply.quantity / supply.targetQuantity * 100))
      return <article className="supply-card" key={supply.id}><header><span className={`supply-symbol tone-${index % 4}`}><Box /></span><span className={isLow ? 'stock low' : 'stock'}>{isLow ? '库存偏低' : '库存充足'}</span></header><h3>{supply.name}</h3><div className="quantity"><strong>{supply.quantity}</strong><span>{supply.unit}</span></div><div className="stock-bar"><i style={{ width: `${percent}%` }} /></div><p>低于 {supply.threshold} {supply.unit}提醒 · {member(supply.buyerId).name} 采购</p><footer><button className="button secondary compact" onClick={() => consume(supply.id)} disabled={supply.quantity <= 0}><Minus size={16} />用掉 1</button><button className="button quiet compact" onClick={() => replenish(supply.id)}><ShoppingBasket size={16} />已补货</button></footer></article>
    })}</section>
    <section className="panel log-panel"><div className="panel-header"><div><span className="eyebrow">使用记录</span><h2>最近使用记录</h2></div><History /></div><div className="log-list">{data.supplyLogs.slice(0, 5).map((log) => { const supply = data.supplies.find((item) => item.id === log.supplyId); const actor = member(log.memberId); return <div key={log.id}><Avatar member={actor} size="sm" /><p><b>{actor.name}</b> {log.change > 0 ? '补充' : '使用'}了 {supply?.name}<small>{log.note} · {formatDate(log.date)}</small></p><strong className={log.change > 0 ? 'positive' : 'negative'}>{log.change > 0 ? '+' : ''}{log.change}</strong></div>})}</div></section>
  </>
}

function PactsPage({ data, currentMember, openModal, toggleAgree, editPact }: { data: AppData; currentMember: Member; openModal: (name: string) => void; toggleAgree: (id: string) => void; editPact: (pact: PactClause) => void }) {
  return <>
    <PageHeading eyebrow="一起商量，一起遵守" title="室友公约" intro="把容易误会的事提前说清，让规则保护关系，而不是束缚关系。" action={<button className="button primary" onClick={() => openModal('pact')}><Plus size={18} />发起公约</button>} />
    <section className="pact-summary"><div className="seal"><ShieldCheck /></div><div><span className="eyebrow">合合屋 · 共同约定</span><h2>{data.pacts.filter((item) => item.agreedBy.length === data.members.length).length} 条公约已正式生效</h2><p>每条公约需要四位室友全部确认。任何人都可以提出修改，重新达成共识。</p></div><div className="member-stack">{data.members.map((member) => <Avatar key={member.id} member={member} />)}</div></section>
    <section className="pact-list">{data.pacts.map((pact, index) => {
      const active = pact.agreedBy.length === data.members.length
      const mine = pact.agreedBy.includes(currentMember.id)
      return <article className={`pact-card tone-${index % 4}`} key={pact.id}><span className="pact-index">{String(index + 1).padStart(2, '0')}</span><div className="pact-content"><header><span className="tag">{pact.category}</span>{active && <span className="active-label"><ShieldCheck size={14} />已生效</span>}</header><h2>{pact.title}</h2><p>{pact.content}</p><footer><div><div className="mini-stack">{data.members.map((member) => <span className={pact.agreedBy.includes(member.id) ? '' : 'waiting'} key={member.id}><Avatar member={member} size="sm" /></span>)}</div><small>{pact.agreedBy.length}/{data.members.length} 人确认</small></div><div className="pact-actions"><button className="icon-button" onClick={() => editPact(pact)} aria-label="编辑公约"><PenLine size={17} /></button><button className={mine ? 'button secondary compact' : 'button primary compact'} onClick={() => toggleAgree(pact.id)}>{mine ? <><Check size={16} />已确认</> : <><Vote size={16} />我同意</>}</button></div></footer></div></article>
    })}</section>
  </>
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [currentMemberId, setCurrentMemberId] = useState(() => window.localStorage.getItem('roomie-home:current') ?? 'm1')
  const [modal, setModal] = useState<string | null>(null)
  const [editingPact, setEditingPact] = useState<PactClause | undefined>()
  const [toast, setToast] = useState('')
  const currentMember = data.members.find((item) => item.id === currentMemberId) ?? data.members[0]
  const noticeCount = data.supplies.filter((item) => item.quantity <= item.threshold).length + data.chores.filter((item) => !item.done && item.assigneeId === currentMember.id).length

  useEffect(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data])
  useEffect(() => window.localStorage.setItem('roomie-home:current', currentMemberId), [currentMemberId])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = (message: string) => setToast(message)
  const memberName = (id: string) => data.members.find((item) => item.id === id)?.name ?? '室友'
  const addActivity = (next: AppData, text: string, tone: 'blue' | 'green' | 'pink' | 'gold') => ({ ...next, activities: [{ id: uid('activity'), text, time: '刚刚', tone }, ...next.activities].slice(0, 12) })

  const addExpense = (expense: Expense) => {
    setData((value) => addActivity({ ...value, expenses: [expense, ...value.expenses] }, `${memberName(expense.payerId)}记录了${expense.title} ¥${money(expense.amount)}`, 'pink'))
    setModal(null); notify('费用已保存，AA 结果已重新计算')
  }
  const settleExpense = (id: string) => {
    setData((value) => ({ ...value, expenses: value.expenses.map((item) => item.id === id ? { ...item, settled: true } : item) }))
    notify('这笔费用已标记结清')
  }
  const addChore = (chore: Chore) => {
    setData((value) => addActivity({ ...value, chores: [chore, ...value.chores] }, `${memberName(chore.assigneeId)}接到了新值日：${chore.title}`, 'green'))
    setModal(null); notify('值日任务已加入排班')
  }
  const toggleChore = (id: string) => {
    const chore = data.chores.find((item) => item.id === id)
    setData((value) => {
      const done = !value.chores.find((item) => item.id === id)?.done
      const next = { ...value, chores: value.chores.map((item) => item.id === id ? { ...item, done } : item) }
      return done && chore ? addActivity(next, `${memberName(chore.assigneeId)}完成了${chore.title}`, 'green') : next
    })
    notify(chore?.done ? '任务已恢复为待完成' : '打卡成功，辛苦啦')
  }
  const generateWeek = () => {
    const future = data.chores.filter((item) => new Date(item.dueDate).getTime() > Date.now() + 5 * 86400000)
    if (future.length) { notify('下周排班已经生成过了'); return }
    const next = data.chores.slice(0, 4).map((item, index) => {
      const date = new Date(`${item.dueDate}T12:00:00`); date.setDate(date.getDate() + 7)
      const oldIndex = data.members.findIndex((member) => member.id === item.assigneeId)
      return { ...item, id: uid(`next-${index}`), dueDate: date.toISOString().slice(0, 10), assigneeId: data.members[(oldIndex + 1) % data.members.length].id, done: false }
    })
    setData((value) => ({ ...value, chores: [...value.chores, ...next] })); notify('已按顺序轮换生成下周排班')
  }
  const addSupply = (supply: Supply) => {
    setData((value) => ({ ...value, supplies: [supply, ...value.supplies] })); setModal(null); notify('公共物品已登记')
  }
  const changeSupply = (id: string, replenish: boolean) => {
    const supply = data.supplies.find((item) => item.id === id)
    if (!supply) return
    const newQuantity = replenish ? supply.targetQuantity : Math.max(0, supply.quantity - 1)
    const change = newQuantity - supply.quantity
    setData((value) => {
      const next = { ...value, supplies: value.supplies.map((item) => item.id === id ? { ...item, quantity: newQuantity, updatedAt: todayIso() } : item), supplyLogs: [{ id: uid('log'), supplyId: id, change, memberId: currentMember.id, date: todayIso(), note: replenish ? '补货完成' : '日常使用' }, ...value.supplyLogs] }
      return change < 0 && newQuantity <= supply.threshold ? addActivity(next, `${supply.name}只剩 ${newQuantity} ${supply.unit}，记得补货`, 'gold') : next
    })
    notify(replenish ? `${supply.name}已补至 ${newQuantity}${supply.unit}` : `已记录使用 1 ${supply.unit}`)
  }
  const savePact = (pact: PactClause) => {
    setData((value) => ({ ...value, pacts: value.pacts.some((item) => item.id === pact.id) ? value.pacts.map((item) => item.id === pact.id ? pact : item) : [pact, ...value.pacts] }))
    setModal(null); setEditingPact(undefined); notify('公约已保存，等待大家确认')
  }
  const toggleAgree = (id: string) => {
    setData((value) => ({ ...value, pacts: value.pacts.map((item) => item.id === id ? { ...item, agreedBy: item.agreedBy.includes(currentMember.id) ? item.agreedBy.filter((memberId) => memberId !== currentMember.id) : [...item.agreedBy, currentMember.id] } : item) }))
    notify('你的确认状态已更新')
  }
  const reset = () => {
    if (!window.confirm('确定恢复初始演示数据吗？你添加的记录会被清除。')) return
    setData(createDemoData()); setCurrentMemberId('m1'); notify('已恢复演示数据')
  }
  const openModal = (name: string) => { setEditingPact(undefined); setModal(name) }

  const modalContent = useMemo(() => {
    if (modal === 'expense') return <Modal title="记一笔共同费用" onClose={() => setModal(null)}><ExpenseForm members={data.members} currentMemberId={currentMember.id} onSave={addExpense} onClose={() => setModal(null)} /></Modal>
    if (modal === 'chore') return <Modal title="添加值日任务" onClose={() => setModal(null)}><ChoreForm members={data.members} currentMemberId={currentMember.id} onSave={addChore} onClose={() => setModal(null)} /></Modal>
    if (modal === 'supply') return <Modal title="登记公共物品" onClose={() => setModal(null)}><SupplyForm members={data.members} currentMemberId={currentMember.id} onSave={addSupply} onClose={() => setModal(null)} /></Modal>
    if (modal === 'pact') return <Modal title={editingPact ? '编辑室友公约' : '发起一条公约'} onClose={() => { setModal(null); setEditingPact(undefined) }}><PactForm initial={editingPact} onSave={savePact} onClose={() => { setModal(null); setEditingPact(undefined) }} /></Modal>
    return null
  }, [modal, editingPact, data.members, currentMember.id])

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Home /></span><div><b>合合屋</b><small>Roomie Home</small></div></div>
      <div className="home-label"><span>我们的小屋</span><b>梧桐里 · 302</b><small><Users size={14} />4 位室友 · 已合租 186 天</small></div>
      <nav aria-label="主导航">{navigation.map(({ to, longLabel, icon: Icon }) => <NavLink to={to} key={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={19} /><span>{longLabel}</span></NavLink>)}</nav>
      <div className="sidebar-note"><Sparkles size={18} /><b>相处小贴士</b><p>及时记录小事，比事后翻旧账更轻松。</p></div>
      <button className="reset-button" onClick={reset}><RotateCcw size={16} />重置演示数据</button>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Home /></span><b>合合屋</b></div><div className="topbar-actions"><button className="notification-button" aria-label={`${noticeCount} 条提醒`}><Bell size={19} />{noticeCount > 0 && <span>{noticeCount}</span>}</button><label className="member-switch"><span>当前身份</span><Avatar member={currentMember} size="sm" /><select value={currentMember.id} onChange={(e) => setCurrentMemberId(e.target.value)} aria-label="切换当前室友">{data.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div></header>
      <main className="page-content"><Routes><Route path="/dashboard" element={<Dashboard data={data} currentMember={currentMember} openModal={openModal} />} /><Route path="/expenses" element={<ExpensesPage data={data} openModal={openModal} settleExpense={settleExpense} />} /><Route path="/chores" element={<ChoresPage data={data} openModal={openModal} toggleChore={toggleChore} generateWeek={generateWeek} />} /><Route path="/supplies" element={<SuppliesPage data={data} openModal={openModal} consume={(id) => changeSupply(id, false)} replenish={(id) => changeSupply(id, true)} />} /><Route path="/pacts" element={<PactsPage data={data} currentMember={currentMember} openModal={openModal} toggleAgree={toggleAgree} editPact={(pact) => { setEditingPact(pact); setModal('pact') }} />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></main>
    </div>
    <nav className="mobile-nav" aria-label="移动端导航">{navigation.map(({ to, label, icon: Icon }) => <NavLink to={to} key={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    {modalContent}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
  </div>
}
