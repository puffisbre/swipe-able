import { gql } from "@apollo/client";

// Authentication mutations
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
        email
        firstName
        lastName
        friendCode
        profileImage
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        username
        email
        firstName
        lastName
        friendCode
        profileImage
      }
    }
  }
`;

// User queries
export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      firstName
      lastName
      friendCode
      profileImage
      friends {
        id
        username
        firstName
        lastName
        friendCode
        profileImage
      }
      isActive
      lastLogin
      createdAt
    }
  }
`;

export const MY_FRIENDS_QUERY = gql`
  query MyFriends {
    myFriends {
      id
      username
      firstName
      lastName
      friendCode
      profileImage
      lastLogin
    }
  }
`;

// Friend system mutations
export const SEND_FRIEND_REQUEST_MUTATION = gql`
  mutation SendFriendRequest($friendCode: String!) {
    sendFriendRequest(friendCode: $friendCode)
  }
`;

export const RESPOND_TO_FRIEND_REQUEST_MUTATION = gql`
  mutation RespondToFriendRequest($requestId: ID!, $accept: Boolean!) {
    respondToFriendRequest(requestId: $requestId, accept: $accept)
  }
`;

// Restaurant and movie queries
export const GET_RESTAURANTS_QUERY = gql`
  query GetRestaurants {
    restaurants {
      id
      name
      description
      cuisine
      rating
      priceRange
      address {
        street
        city
        zipCode
        country
      }
      images {
        url
        alt
      }
    }
  }
`;

export const GET_MOVIES_QUERY = gql`
  query GetMovies {
    movies {
      id
      title
      description
      genre
      director
      actors
      releaseYear
      duration
      rating
      posterUrl
      trailerUrl
    }
  }
`;

// Favorites mutations
export const ADD_TO_FAVORITES_MUTATION = gql`
  mutation AddToFavorites($input: FavoriteInput!) {
    addToFavorites(input: $input) {
      id
      itemType
      notes
      rating
      tags
      dateVisited
      isWishlist
      item {
        ... on Restaurant {
          id
          name
          cuisine
        }
        ... on Movie {
          id
          title
          director
        }
      }
    }
  }
`;

export const GET_MY_FAVORITES_QUERY = gql`
  query GetMyFavorites($itemType: String, $isWishlist: Boolean) {
    myFavorites(itemType: $itemType, isWishlist: $isWishlist) {
      id
      itemType
      notes
      rating
      tags
      dateVisited
      isWishlist
      createdAt
      item {
        ... on Restaurant {
          id
          name
          description
          cuisine
          rating
          priceRange
        }
        ... on Movie {
          id
          title
          description
          director
          releaseYear
          rating
        }
      }
    }
  }
`;
