import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DetailScreen from "../screens/Detail";
import OnboardingScreen from "../screens/Onboarding";
import SearchScreen from "../screens/Search";
import { MainTabNavigator } from "./MainTabNavigator";

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Search: { category?: string; query?: string };
  Detail: { facilityId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{ headerShown: false, animation: "ios_from_right" }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
