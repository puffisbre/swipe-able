import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View, Pressable } from "react-native";

type RootStackParamList = { Home: undefined; Details: { id: string } };
const Stack = createNativeStackNavigator<RootStackParamList>();

function Home({ navigation }: any) {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
      <Pressable onPress={() => navigation.push("Details", { id: "42" })}>
        <Text>Gå till details</Text>
      </Pressable>
    </View>
  );
}

function Details({ route }: any) {
  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
      <Text>Details för id: {route.params.id}</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerBackVisible: false }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Details" component={Details} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
