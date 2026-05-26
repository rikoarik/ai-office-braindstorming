import dayjs from "dayjs";
export const monthRefNow = () => dayjs().format("YYYY-MM");
export const remainingDaysToPayday = (paydayDate: string) => {
  const today = dayjs();
  const pay = dayjs(paydayDate).date();
  let target = today.date(pay);
  if (target.isBefore(today, "day")) target = target.add(1, "month");
  return Math.max(1, target.diff(today, "day"));
};
export const isDueInDays = (iso: string, days = 7) => dayjs(iso).diff(dayjs(), "day") <= days;