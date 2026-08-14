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
import {AiPlaceholderScreen} from '@/screens/ai/AiPlaceholderScreen';
import {ProfileScreen} from '@/screens/profile/ProfileScreen';

// ── Param lists ───────────────────────────────────────────────────────────────
export type ExamsStackParamList = {
  ExamsList: undefined;
  AddExam: {examId?: string} | undefined;
};

export type SubjectsStackParamList = {
  SubjectsList: undefined;
  AddSubject: {subjectId?: string} | undefined;
};

// ── Exam stack ────────────────────────────────────────────────────────────────
const ExamsStack = createNativeStackNavigator<ExamsStackParamList>();
function ExamsStackNavigator() {
  return (
    <ExamsStack.Navigator screenOptions={{headerShown: false}}>
      <ExamsStack.Screen name="ExamsList" component={ExamsScreen} />
      <ExamsStack.Screen name="AddExam" component={AddExamScreen} />
    </ExamsStack.Navigator>
  );
}

// ── Subjects stack ────────────────────────────────────────────────────────────
const SubjectsStack = createNativeStackNavigator<SubjectsStackParamList>();
function SubjectsStackNavigator() {
  return (
    <SubjectsStack.Navigator screenOptions={{headerShown: false}}>
      <SubjectsStack.Screen name="SubjectsList" component={SubjectsScreen} />
      <SubjectsStack.Screen name="AddSubject" component={AddSubjectScreen} />
    </SubjectsStack.Navigator>
  );
}

// ── Tab icons ─────────────────────────────────────────────────────────────────
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
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Exams" component={ExamsStackNavigator} />
      <Tab.Screen name="AI" component={AiPlaceholderScreen} />
      <Tab.Screen name="Profile" component={SubjectsStackNavigator} options={{title: 'Subjects'}} />
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
