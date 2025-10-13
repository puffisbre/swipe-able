import { gql } from "graphql-tag";

const userTypeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    firstName: String!
    lastName: String!
    profileImage: String
    friendCode: String!
    friends: [User]
    friendRequests: [FriendRequest]
    favorites: [Favorite]
    isActive: Boolean
    lastLogin: String
    createdAt: String
    updatedAt: String
  }

  type FriendRequest {
    from: User!
    status: String!
    createdAt: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    profileImage: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    me: User
    getUserByFriendCode(friendCode: String!): User
    myFriends: [User]
    myFriendRequests: [FriendRequest]
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload
    login(input: LoginInput!): AuthPayload
    logout: Boolean
    updateProfile(input: UpdateProfileInput!): User
    sendFriendRequest(friendCode: String!): Boolean
    respondToFriendRequest(requestId: ID!, accept: Boolean!): Boolean
    removeFriend(friendId: ID!): Boolean
  }

  input UpdateProfileInput {
    firstName: String
    lastName: String
    profileImage: String
  }
`;

export default userTypeDefs;
