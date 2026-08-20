import "./src/global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Toast } from "./src/components/Toast";
import { queryClient } from "./src/lib/queryClient";
import { RootNavigator } from "./src/navigation/RootNavigator";

// Pretendard is registered via expo-font (see app.json) but React Native has no
// cascading default font — wire the Regular weight as the app-wide default here.
// Bold/semibold Tailwind classes (font-bold/font-semibold) elsewhere in the app
// will NOT automatically resolve to Pretendard-Bold/Pretendard-SemiBold on
// Android through this mechanism; that needs separate, explicit per-weight
// handling and is out of scope for this change.
// @ts-expect-error -- Text.defaultProps is not part of the RN Text typings, but is honored at runtime
Text.defaultProps = Text.defaultProps || {};
// @ts-expect-error -- see above
Text.defaultProps.style = [{ fontFamily: "Pretendard-Regular" }, Text.defaultProps.style];
// @ts-expect-error -- TextInput.defaultProps is not part of the RN TextInput typings, but is honored at runtime
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-expect-error -- see above
TextInput.defaultProps.style = [{ fontFamily: "Pretendard-Regular" }, TextInput.defaultProps.style];

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View className="flex-1">
          <RootNavigator />
          <Toast />
        </View>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
