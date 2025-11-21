import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: React.ReactNode;
}

/**
 * Reusable screen layout component with SafeAreaView
 * Only handles bottom safe area - navigation header handles the top
 */
export const Screen: React.FC<ScreenProps> = ({ children }) => {
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
