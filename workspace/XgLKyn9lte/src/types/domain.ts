export type WarnLevel = "AMAN" | "MEPET" | "BAHAYA";
export type ExpenseCategory = "Makan"|"Rokok"|"Bensin"|"Kopi"|"Lainnya";
export type IncomeStatus = "unpaid"|"partial"|"paid";
export interface MonthlyConfig { openingBalance:number; salary:number; paydayDate:string; rent:number; paylaterTotal:number; monthlyFuel:number; dailyMealBudget:number; smokingDaily:number; emergencyTarget?:number; }
export interface Expense { id:string; monthRef:string; category:ExpenseCategory; amount:number; note?:string; date:string; }
export interface Bill { id:string; monthRef:string; name:string; amount:number; dueDate:string; paid:boolean; recurring:boolean; }
export interface ProjectIncome { id:string; monthRef:string; name:string; expected:number; received:number; status:IncomeStatus; }
export interface MonthData { monthRef:string; config:MonthlyConfig|null; expenses:Expense[]; bills:Bill[]; incomes:ProjectIncome[]; ai?:{ baseUrl?:string; apiKey?:string; model?:string }; }