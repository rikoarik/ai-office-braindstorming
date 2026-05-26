import AsyncStorage from "@react-native-async-storage/async-storage";
export const storage = {
  async get<T>(k:string, fb:T): Promise<T> { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) as T : fb; },
  async set<T>(k:string, v:T) { await AsyncStorage.setItem(k, JSON.stringify(v)); },
  async del(k:string){ await AsyncStorage.removeItem(k); }
};