import { View } from "react-native";

import { Text } from "./AppText";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="items-center px-5 py-16">
      <Text className="mb-1.5 text-body text-ink-faint">{title}</Text>
      <Text className="text-center text-footnote leading-5 text-ink-faint">{description}</Text>
    </View>
  );
}
