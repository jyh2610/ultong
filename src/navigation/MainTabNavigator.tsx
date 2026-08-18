import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { TabCourseIcon } from "../components/icons/TabCourseIcon";
import { TabHomeIcon } from "../components/icons/TabHomeIcon";
import { TabMypageIcon } from "../components/icons/TabMypageIcon";
import { TabOfflineIcon } from "../components/icons/TabOfflineIcon";
import CourseScreen from "../screens/Course";
import HomeScreen from "../screens/Home";
import MyPageScreen from "../screens/MyPage";
import OfflineScreen from "../screens/Offline";

export type MainTabParamList = {
  Home: undefined;
  Course: undefined;
  Offline: undefined;
  MyPage: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7A4A2B",
        tabBarInactiveTintColor: "#9A9A9E",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "홈", tabBarIcon: ({ color }) => <TabHomeIcon color={color} /> }}
      />
      <Tab.Screen
        name="Course"
        component={CourseScreen}
        options={{ tabBarLabel: "코스", tabBarIcon: ({ color }) => <TabCourseIcon color={color} /> }}
      />
      <Tab.Screen
        name="Offline"
        component={OfflineScreen}
        options={{ tabBarLabel: "보관함", tabBarIcon: ({ color }) => <TabOfflineIcon color={color} /> }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{ tabBarLabel: "마이페이지", tabBarIcon: ({ color }) => <TabMypageIcon color={color} /> }}
      />
    </Tab.Navigator>
  );
}
