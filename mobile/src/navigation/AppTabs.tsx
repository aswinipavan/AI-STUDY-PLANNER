import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text, StyleSheet} from 'react-native';
import {COLORS} from '@/constants/colors';

// Screens
import {DashboardScreen} from '@/screens/dashboard/DashboardScreen';
import {TimetableScreen} from '@/screens/timetable/TimetableScreen';
import {ExamsScreen} from '@/screens/exams/ExamsScreen';
import {AddExamScreen} from '@/screens/exams/AddExamScreen';
import {SubjectsScreen} from '@/screens/subjects/SubjectsScreen';
import {AddSubjectScreen} from '@/screens/subjects/AddSubjectScreen';
import {AiChatScreen} from '@/screens/ai/AiChatScreen';
import {MaterialsScreen} from '@/screens/materials/MaterialsScreen';
import {UploadMaterialScreen} from '@/screens/materials/UploadMaterialScreen';
import {AnalyticsScreen} from '@/screens/analytics/AnalyticsScreen';
import {ProfileScreen} from '@/screens/profile/ProfileScreen';
import {SettingsScreen} from '@/screens/settings/SettingsScreen';

// ── Param Lists ──────────────────────────────────────────────────────────────
export type HomeStackParamList = {
  Dashboard: undefined;
  Subjects: undefined;
  AddSubject: {subjectId?: string} | undefined;
  Materials: undefined;
  UploadMaterial: undefined;
  Analytics: undefined;
  Settings: undefined;
  Timetable: undefined;
  Exams: undefined;
  AiChat: undefined;
};

export type ExamsStackParamList = {
  ExamsList: undefined;
  AddExam: {examId?: string} | undefined;
};

export type SubjectsStackParamList = {
  SubjectsList: undefined;
  AddSubject: {subjectId?: string} | undefined;
};


export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  Subjects: undefined;
  AddSubject: {subjectId?: string} | undefined;
  Materials: undefined;
  UploadMaterial: undefined;
  Analytics: undefined;
};

// ── Home Stack ────────────────────────────────────────────────────────────────
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{headerShown: false}}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="Subjects" component={SubjectsScreen} />
      <HomeStack.Screen name="AddSubject" component={AddSubjectScreen} />
      <HomeStack.Screen name="Materials" component={MaterialsScreen} />
      <HomeStack.Screen name="UploadMaterial" component={UploadMaterialScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} />
    </HomeStack.Navigator>
  );
}

// ── Exams Stack ───────────────────────────────────────────────────────────────
const ExamsStack = createNativeStackNavigator<ExamsStackParamList>();
function ExamsStackNavigator() {
  return (
    <ExamsStack.Navigator screenOptions={{headerShown: false}}>
      <ExamsStack.Screen name="ExamsList" component={ExamsScreen} />
      <ExamsStack.Screen name="AddExam" component={AddExamScreen} />
    </ExamsStack.Navigator>
  );
}

// ── Profile Stack ─────────────────────────────────────────────────────────────
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{headerShown: false}}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Subjects" component={SubjectsScreen} />
      <ProfileStack.Screen name="AddSubject" component={AddSubjectScreen} />
      <ProfileStack.Screen name="Materials" component={MaterialsScreen} />
      <ProfileStack.Screen name="UploadMaterial" component={UploadMaterialScreen} />
      <ProfileStack.Screen name="Analytics" component={AnalyticsScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Tab Icons ─────────────────────────────────────────────────────────────────
const TAB_ICONS: Record<string, {active: string; inactive: string}> = {
  Home: {active: '🏠', inactive: '🏡'},
  Timetable: {active: '📅', inactive: '📆'},
  Exams: {active: '📝', inactive: '📋'},
  AI: {active: '🤖', inactive: '🤖'},
  Profile: {active: '👤', inactive: '👤'},
};

// ── Bottom Tab Navigator ──────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.TAB_ACTIVE,
        tabBarInactiveTintColor: COLORS.TAB_INACTIVE,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused}) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Text style={styles.tabIcon}>
              {focused ? icons?.active : icons?.inactive}
            </Text>
          );
        },
      })}>
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Exams" component={ExamsStackNavigator} />
      <Tab.Screen name="AI" component={AiChatScreen} options={{title: 'AI Tutor'}} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.TAB_BG,
    borderTopColor: COLORS.BG_BORDER,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
  },
});
