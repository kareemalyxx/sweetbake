import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/auth';
import { Theme } from '../theme';
import { triggerHaptic } from '../services/haptics';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  currentUserEmail,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter both an email and a password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await AuthService.signUp(email, password, displayName.trim());
        triggerHaptic.success();
        Alert.alert('Welcome! 🎂', 'Your SweetBake account has been created.');
      } else {
        await AuthService.signIn(email, password);
        triggerHaptic.success();
      }
      onClose();
    } catch (err: any) {
      triggerHaptic.warning();
      const message = err.message || 'Authentication failed. Please verify credentials.';
      Alert.alert('Auth Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      triggerHaptic.selection();
      onClose();
    } catch (err: any) {
      Alert.alert('Sign Out Failed', err.message);
    }
  };

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={24} color={Theme.colors.deepRose} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {currentUserEmail ? (
            <View style={styles.signedInSection}>
              <Text style={styles.title}>Signed In</Text>
              <Text style={styles.userEmail}>{currentUserEmail}</Text>
              <Text style={styles.subtitle}>
                Your custom orders and requirements are synced to your Firebase Cloud backend.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: Theme.colors.deepRose }]}
                onPress={handleSignOut}
              >
                <Text style={styles.primaryButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>
                {isSignUp ? 'Create Studio Account' : 'Welcome to SweetBake'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUp
                  ? 'Sign up to backup & sync orders with Firebase Cloud Firestore.'
                  : 'Log in with your email and password to sync your bespoke bakery commissions.'}
              </Text>

              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bakery / Studio Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Eleanor's Patisserie"
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="baker@sweetbake.studio"
                  placeholderTextColor={Theme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? 'Sign Up' : 'Log In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  triggerHaptic.light();
                  setIsSignUp(!isSignUp);
                }}
              >
                <Text style={styles.switchText}>
                  {isSignUp
                    ? 'Already have an account? Log In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.blushPink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  signedInSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.deepRose,
    marginVertical: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.colors.cream,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.colors.textDark,
  },
  primaryButton: {
    backgroundColor: Theme.colors.deepRose,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    color: Theme.colors.roseGold,
    fontWeight: '600',
  },
});
