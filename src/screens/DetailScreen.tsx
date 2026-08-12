import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { useCounterStore } from "../store/exampleStore";

type Props = NativeStackScreenProps<RootStackParamList, "Detail">;

export function DetailScreen({ navigation }: Props) {
  const count = useCounterStore((state) => state.count);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-white">
      <Text className="text-xl font-semibold text-slate-900">Detail Screen</Text>
      <Text className="text-base text-slate-600">Current count: {count}</Text>

      <Pressable
        onPress={() => navigation.goBack()}
        className="rounded-full border border-slate-300 px-6 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-slate-900">Go back</Text>
      </Pressable>
    </View>
  );
}
