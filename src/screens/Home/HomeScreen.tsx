import { Pressable, Text, View } from "react-native";

import { useCounterStore } from "../../store/exampleStore";
import type { HomeScreenProps } from "./types";

export function HomeScreen({ navigation }: HomeScreenProps) {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white">
      <Text className="text-2xl font-bold text-slate-900">mungnyangroad</Text>
      <Text className="text-lg text-slate-600">Count: {count}</Text>

      <Pressable
        onPress={increment}
        className="rounded-full bg-slate-900 px-6 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-white">Increment</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("Detail")}
        className="rounded-full border border-slate-300 px-6 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-slate-900">Go to Detail</Text>
      </Pressable>
    </View>
  );
}
