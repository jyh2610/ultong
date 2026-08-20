import { useEffect } from "react";

import { Text } from "./AppText";
import { useToastStore } from "../store/toastStore";

export function Toast() {
  const message = useToastStore((state) => state.message);
  const clear = useToastStore((state) => state.clear);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, 1800);
    return () => clearTimeout(timer);
  }, [message, clear]);

  if (!message) return null;

  return (
    <Text className="absolute bottom-5 left-5 right-5 z-30 rounded-xl bg-ink px-4 py-3 text-center text-[12.5px] text-white">
      {message}
    </Text>
  );
}
