import { Pressable, Text, View } from "react-native";

import type { DetailScreenProps } from "./types";

export function DetailScreen({ navigation }: DetailScreenProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white">
      <Text className="text-xl font-semibold text-slate-900">Detail Screen</Text>

      <Pressable
        onPress={() => navigation.goBack()}
        className="rounded-full border border-slate-300 px-6 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-slate-900">Go back</Text>
      </Pressable>
    </View>
  );
}
