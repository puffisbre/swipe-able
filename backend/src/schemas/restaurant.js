import { gql } from "graphql-tag";

const restaurantTypeDefs = gql`
  type Address {
    street: String
    city: String
    zipCode: String
    country: String
  }

  type Location {
    latitude: Float
    longitude: Float
  }

  type Image {
    url: String
    alt: String
  }

  type Restaurant {
    id: ID!
    name: String!
    description: String!
    cuisine: String!
    address: Address
    location: Location
    rating: Float
    priceRange: String!
    images: [Image]
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  input AddressInput {
    street: String
    city: String
    zipCode: String
    country: String
  }

  input LocationInput {
    latitude: Float
    longitude: Float
  }

  input ImageInput {
    url: String
    alt: String
  }

  input RestaurantInput {
    name: String!
    description: String!
    cuisine: String!
    address: AddressInput
    location: LocationInput
    rating: Float
    priceRange: String!
    images: [ImageInput]
    isActive: Boolean
  }

  type Query {
    restaurants: [Restaurant]
    restaurant(id: ID!): Restaurant
    restaurantsByCuisine(cuisine: String!): [Restaurant]
    restaurantsByPriceRange(priceRange: String!): [Restaurant]
  }

  type Mutation {
    createRestaurant(input: RestaurantInput!): Restaurant
    updateRestaurant(id: ID!, input: RestaurantInput!): Restaurant
    deleteRestaurant(id: ID!): Boolean
  }
`;

export default restaurantTypeDefs;
