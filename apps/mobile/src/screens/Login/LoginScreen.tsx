import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { TextInput } from "../../components/AppTextInput";
import { PressableScale } from "../../components/PressableScale";
import { getErrorMessage } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { login } from "./api/login";
import type { LoginScreenProps } from "./types";

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const setTokens = useAuthStore((state) => state.setTokens);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  async function handleSubmit() {
    if (!email || !password) {
      showToast("이메일과 비밀번호를 입력해주세요");
      return;
    }
    setSubmitting(true);
    try {
      const { accessToken, refreshToken } = await login(email, password);
      await setTokens(accessToken, refreshToken);
    } catch (error) {
      showToast(getErrorMessage(error, "로그인에 실패했어요"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-screen"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="mb-1 text-footnote font-bold tracking-wide text-primary">멍냥로드</Text>
        <Text className="mb-8 text-display font-bold text-ink">로그인</Text>

        <Text className="mb-1.5 text-footnote font-bold text-ink-soft">이메일</Text>
        <TextInput
          className="mb-4 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-body text-ink"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Text className="mb-1.5 text-footnote font-bold text-ink-soft">비밀번호</Text>
        <TextInput
          className="mb-6 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-body text-ink"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="8자 이상"
        />

        <PressableScale
          onPress={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-primary p-4"
        >
          <Text className="text-center text-subtitle font-bold text-white">
            {submitting ? "로그인 중..." : "로그인"}
          </Text>
        </PressableScale>

        <PressableScale onPress={() => navigation.navigate("Signup")} className="mt-4 p-2">
          <Text className="text-center text-body text-ink-soft">계정이 없으신가요? 회원가입</Text>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
