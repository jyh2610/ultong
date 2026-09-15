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
  Search: { category?: string; query?: string; autoDistanceSort?: boolean };
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
