import { create } from "zustand";
import { MonthData, Expense, Bill, ProjectIncome, MonthlyConfig } from "@/types/domain";
import { storage } from "@/storage/storage";
import { monthRefNow } from "@/utils/date";

type State = { hydrated:boolean; monthRef:string; months:Record<string,MonthData>;
 init:()=>Promise<void>; setConfig:(c:MonthlyConfig)=>void; addExpense:(e:Expense)=>void; addBill:(b:Bill)=>void; addIncome:(i:ProjectIncome)=>void; };
const key="cukupgak.v1";
const emptyMonth=(ref:string):MonthData=>({monthRef:ref,config:null,expenses:[],bills:[],incomes:[]});

export const useAppStore = create<State>((set,get)=>({
  hydrated:false, monthRef:monthRefNow(), months:{},
  init: async()=>{ const data=await storage.get<Record<string,MonthData>>(key,{}); const ref=monthRefNow(); set({months:data,monthRef:ref,hydrated:true}); if(!data[ref]) set(s=>({months:{...s.months,[ref]:emptyMonth(ref)}})); },
  setConfig:(c)=> set(s=>{ const m=s.months[s.monthRef]??emptyMonth(s.monthRef); const n={...s.months,[s.monthRef]:{...m,config:c}}; storage.set(key,n); return {months:n}; }),
  addExpense:(e)=> set(s=>{ const m=s.months[s.monthRef]; const n={...s.months,[s.monthRef]:{...m,expenses:[e,...m.expenses]}}; storage.set(key,n); return {months:n}; }),
  addBill:(b)=> set(s=>{ const m=s.months[s.monthRef]; const n={...s.months,[s.monthRef]:{...m,bills:[b,...m.bills]}}; storage.set(key,n); return {months:n}; }),
  addIncome:(i)=> set(s=>{ const m=s.months[s.monthRef]; const n={...s.months,[s.monthRef]:{...m,incomes:[i,...m.incomes]}}; storage.set(key,n); return {months:n}; }),
}));