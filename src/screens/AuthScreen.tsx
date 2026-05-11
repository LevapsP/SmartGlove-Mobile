/**
 * AuthScreen.tsx — no logic bugs found in original.
 * Changes: updated imports to use typed API functions.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Mail, Lock, User as UserIcon } from 'lucide-react-native';
import { authApi } from '../services/api';
import { useStore } from '../store/useStore';

export default function AuthScreen() {
  const [isLogin, setIsLogin]     = useState(true);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);

  const setAuth = useStore(state => state.setAuth);

  const handleAuth = async () => {
  if (!email.trim() || !password.trim()) {
    Alert.alert('Error', 'Please fill in all fields');
    return;
  }
  setLoading(true);
  try {
    if (isLogin) {
      const { data } = await authApi.login({ email, password });
      setAuth(data.token);
      console.log('FULL TOKEN AFTER LOGIN:', data.token);
    } else {
      const { data } = await authApi.register({ email, password });
      setAuth(data.token);
    }
  } catch (err: any) {
    Alert.alert(
      'Authentication Failed',
      err.response?.data?.message ?? 'Check your credentials and try again.',
    );
  } finally {
    setLoading(false);
  }
};



  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.formCard}>
        <View style={styles.header}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>SmartGlove Professional Suite</Text>
        </View>


        <View style={styles.inputWrapper}>
          <Mail color="#94A3B8" size={20} style={styles.icon} />
          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#64748B"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Lock color="#94A3B8" size={20} style={styles.icon} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#64748B"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity style={styles.mainBtn} onPress={handleAuth} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.mainBtnText}>{isLogin ? 'Sign In' : 'Register'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsLogin(v => !v)}>
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', padding: 20 },
  formCard:     { backgroundColor: '#1E293B', borderRadius: 24, padding: 30, borderWidth: 1, borderColor: '#334155' },
  header:       { marginBottom: 30 },
  title:        { color: '#F8FAFC', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:     { color: '#64748B', fontSize: 14, marginTop: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, marginBottom: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: '#334155' },
  icon:         { marginRight: 10 },
  input:        { flex: 1, height: 50, color: '#F8FAFC', fontSize: 16 },
  mainBtn:      { backgroundColor: '#3B82F6', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  mainBtnText:  { color: '#fff', fontSize: 18, fontWeight: '700' },
  toggleBtn:    { marginTop: 20, alignItems: 'center' },
  toggleText:   { color: '#94A3B8', fontSize: 14 },
});
