import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// HTTP link to GraphQL server
const httpLink = createHttpLink({
  uri: "http://localhost:4001/graphql", // Uppdatera om backend körs på annan URL
});

// Auth link to add JWT token to headers
const authLink = setContext(async (_, { headers }) => {
  try {
    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem("authToken");

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  } catch (error) {
    console.error("Error getting auth token:", error);
    return { headers };
  }
});

// Apollo Client instance
const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
    },
    query: {
      errorPolicy: "all",
    },
  },
});

export default client;
