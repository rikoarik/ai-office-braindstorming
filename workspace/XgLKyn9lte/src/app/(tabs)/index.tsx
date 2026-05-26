import { View, Text } from "react-native";
import { useAppStore } from "@/store/appStore";
import { calcDashboard } from "@/services/budgetCalculator";
import { formatIDR } from "@/utils/currency";
export default function Home(){
  const { monthRef, months } = useAppStore();
  const d = calcDashboard(months[monthRef]);
  if(!d) return <Text>Setup dulu ya.</Text>;
  return <View style={{padding:16,gap:8}}>
    <Text>Saldo real: {formatIDR(d.realBalance)}</Text>
    <Text>Budget aman/hari: {formatIDR(d.safeDaily)}</Text>
    <Text>Hari menuju gajian: {d.days}</Text>
    <Text>Status: {d.warn}</Text>
    <Text>Potensi income belum dihitung: {formatIDR(d.unpaidPotential)}</Text>
  </View>;
}