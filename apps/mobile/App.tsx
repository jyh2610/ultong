import "./src/global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Toast } from "./src/components/Toast";
import { queryClient } from "./src/lib/queryClient";
import { RootNavigator } from "./src/navigation/RootNavigator";

const isWeb = Platform.OS === "web";

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View className={isWeb ? "flex-1 items-center bg-frame" : "flex-1"}>
          <View
            className={isWeb ? "w-full flex-1 border-x border-card-border-alt bg-screen" : "flex-1"}
            style={isWeb ? { maxWidth: 430 } : undefined}
          >
            <RootNavigator />
            <Toast />
          </View>
        </View>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
