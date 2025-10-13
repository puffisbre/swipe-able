import { gql } from "graphql-tag";

const movieTypeDefs = gql`
  type Movie {
    id: ID!
    title: String!
    description: String!
    genre: [String!]!
    director: String!
    actors: [String]
    releaseYear: Int!
    duration: Int!
    rating: Float
    imdbId: String
    tmdbId: String
    posterUrl: String
    trailerUrl: String
    language: String
    country: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  input MovieInput {
    title: String!
    description: String!
    genre: [String!]!
    director: String!
    actors: [String]
    releaseYear: Int!
    duration: Int!
    rating: Float
    imdbId: String
    tmdbId: String
    posterUrl: String
    trailerUrl: String
    language: String
    country: String
    isActive: Boolean
  }

  type Query {
    movies: [Movie]
    movie(id: ID!): Movie
    moviesByGenre(genre: String!): [Movie]
    moviesByYear(year: Int!): [Movie]
    searchMovies(query: String!): [Movie]
  }

  type Mutation {
    createMovie(input: MovieInput!): Movie
    updateMovie(id: ID!, input: MovieInput!): Movie
    deleteMovie(id: ID!): Boolean
  }
`;

export default movieTypeDefs;
