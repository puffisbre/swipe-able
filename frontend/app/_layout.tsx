import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ApolloProvider } from "@apollo/client/react";
import "react-native-reanimated";

import client from "../utils/apollo-client";
import { AuthProvider } from "../contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <ThemeProvider value={DefaultTheme}>
          <ProtectedRoute>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
          </ProtectedRoute>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
