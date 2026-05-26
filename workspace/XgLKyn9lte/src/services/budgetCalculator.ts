import { MonthData } from "@/types/domain";
import { remainingDaysToPayday, isDueInDays } from "@/utils/date";
import { STATUS_RULE } from "@/constants/thresholds";

export function calcDashboard(m: MonthData) {
  const cfg = m.config;
  if (!cfg) return null;
  const expense = m.expenses.reduce((a,b)=>a+b.amount,0);
  const paidBills = m.bills.filter(b=>b.paid).reduce((a,b)=>a+b.amount,0);
  const incomeReal = m.incomes.reduce((a,i)=>a+(i.status==="paid"?i.received:0),0);
  const unpaidPotential = m.incomes.reduce((a,i)=>a+(i.status==="paid"?0:i.expected-i.received),0);
  const realBalance = cfg.openingBalance + cfg.salary + incomeReal - cfg.rent - cfg.paylaterTotal - expense - paidBills;
  const days = remainingDaysToPayday(cfg.paydayDate);
  const safeDaily = Math.floor(realBalance / days);
  const nearDue = m.bills.some(b=>!b.paid && isDueInDays(b.dueDate,7));
  let warn: "AMAN"|"MEPET"|"BAHAYA" = safeDaily >= STATUS_RULE.AMAN ? "AMAN" : safeDaily >= STATUS_RULE.MEPET ? "MEPET" : "BAHAYA";
  if (realBalance < 0 || nearDue) warn = "BAHAYA";
  return { realBalance, safeDaily, days, warn, unpaidPotential };
}