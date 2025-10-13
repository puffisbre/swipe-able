import { gql } from "graphql-tag";

const favoriteTypeDefs = gql`
  union FavoriteItem = Restaurant | Movie

  type Favorite {
    id: ID!
    user: User!
    itemType: String!
    item: FavoriteItem!
    notes: String
    rating: Int
    tags: [String]
    dateVisited: String
    isWishlist: Boolean!
    createdAt: String
    updatedAt: String
  }

  input FavoriteInput {
    itemId: ID!
    itemType: String!
    notes: String
    rating: Int
    tags: [String]
    dateVisited: String
    isWishlist: Boolean
  }

  input UpdateFavoriteInput {
    notes: String
    rating: Int
    tags: [String]
    dateVisited: String
    isWishlist: Boolean
  }

  type Query {
    myFavorites(itemType: String, isWishlist: Boolean): [Favorite]
    getFavorite(itemId: ID!, itemType: String!): Favorite
  }

  type Mutation {
    addToFavorites(input: FavoriteInput!): Favorite
    updateFavorite(id: ID!, input: UpdateFavoriteInput!): Favorite
    removeFromFavorites(id: ID!): Boolean
  }
`;

export default favoriteTypeDefs;
