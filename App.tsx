import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { Brain, Mic, List } from 'lucide-react-native';

import AuthScreen       from './src/screens/AuthScreen';
import ModelsScreen     from './src/screens/ModelsScreen';
import RecordingScreen  from './src/screens/RecordingScreen';
import TranslatorScreen from './src/screens/TranslatorScreen';
import { useStore } from './src/store/useStore';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 70,
          paddingBottom: 10,
        },
        tabBarActiveTintColor:   '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="Translate"
        component={TranslatorScreen}
        options={{ tabBarIcon: ({ color, size }) => <Brain color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Models"
        component={ModelsScreen}
        options={{ tabBarIcon: ({ color, size }) => <List color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Record"
        component={RecordingScreen}
        options={{ tabBarIcon: ({ color, size }) => <Mic color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  // Zustand persist rehydrates token from AsyncStorage automatically.
  // This selector only re-renders App when token changes — not on every store update.
  const token = useStore(state => state.token);

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <Stack.Screen name="App" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
