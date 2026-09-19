import { useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DetailScreen from "../screens/Detail";
import LoginScreen from "../screens/Login";
import OnboardingScreen from "../screens/Onboarding";
import SearchScreen from "../screens/Search";
import SignupScreen from "../screens/Signup";
import { usePets } from "../hooks/usePets";
import { useAuthStore } from "../store/authStore";
import { MainTabNavigator } from "./MainTabNavigator";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  // autoDistanceSort는 boolean이 아니라 매 호출마다 달라지는 트리거 값(Date.now())이다 —
  // 화면이 스택에 이미 있어 리마운트 없이 재사용될 때도(React Navigation 기본 동작)
  // 값이 매번 바뀌어야 SearchScreen의 트리거 useEffect가 다시 실행된다.
  Search: { category?: string; query?: string; autoDistanceSort?: number };
  Detail: { facilityId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);
  const { data: pets, isPending: petsPending } = usePets({ enabled: status === "authenticated" });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (status === "loading" || (status === "authenticated" && petsPending)) {
    return <View className="flex-1 bg-screen" />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={
          status === "authenticated" ? (pets && pets.length > 0 ? "MainTabs" : "Onboarding") : "Login"
        }
        screenOptions={{ headerShown: false, animation: "ios_from_right" }}
      >
        {status === "authenticated" ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Detail" component={DetailScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
