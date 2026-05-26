import { Stack, Redirect } from "expo-router";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
export default function RootLayout(){
  const { init, hydrated, months, monthRef } = useAppStore();
  useEffect(()=>{ init(); },[init]);
  if(!hydrated) return null;
  const hasConfig = months[monthRef]?.config;
  return <>
    {!hasConfig ? <Redirect href="/setup" /> : null}
    <Stack screenOptions={{headerShown:false}} />
  </>;
}