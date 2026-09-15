import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { TextInput } from "../../components/AppTextInput";
import { PressableScale } from "../../components/PressableScale";
import { getErrorMessage } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { signup } from "./api/signup";
import type { SignupScreenProps } from "./types";

export function SignupScreen({ navigation }: SignupScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const setTokens = useAuthStore((state) => state.setTokens);
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  async function handleSubmit() {
    if (!email || !password || !nickname) {
      showToast("모든 항목을 입력해주세요");
      return;
    }
    if (password.length < 8) {
      showToast("비밀번호는 8자 이상이어야 해요");
      return;
    }
    setSubmitting(true);
    try {
      const { accessToken, refreshToken } = await signup(email, password, nickname);
      await setTokens(accessToken, refreshToken);
    } catch (error) {
      showToast(getErrorMessage(error, "회원가입에 실패했어요"));
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
      <ScrollView contentContainerClassName="flex-1 justify-center px-6">
        <Text className="mb-1 text-footnote font-bold tracking-wide text-primary">멍냥로드</Text>
        <Text className="mb-8 text-display font-bold text-ink">회원가입</Text>

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
          className="mb-4 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-body text-ink"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="8자 이상"
        />

        <Text className="mb-1.5 text-footnote font-bold text-ink-soft">닉네임</Text>
        <TextInput
          className="mb-6 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-body text-ink"
          value={nickname}
          onChangeText={setNickname}
          maxLength={30}
          placeholder="최대 30자"
        />

        <PressableScale
          onPress={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-primary p-4"
        >
          <Text className="text-center text-subtitle font-bold text-white">
            {submitting ? "가입 중..." : "회원가입"}
          </Text>
        </PressableScale>

        <PressableScale onPress={() => navigation.navigate("Login")} className="mt-4 p-2">
          <Text className="text-center text-body text-ink-soft">이미 계정이 있으신가요? 로그인</Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
