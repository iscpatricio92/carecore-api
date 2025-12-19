/**
 * Pagination-related interfaces
 *
 * These types are shared between mobile and web applications
 * for handling paginated API requests and responses
 */

/**
 * Pagination parameters for API requests
 *
 * Used when making paginated requests to the API.
 * The frontend can specify page number and items per page.
 *
 * @example
 * {
 *   page: 1,
 *   limit: 20
 * }
 */
export interface PaginationParams {
  /**
   * Page number (1-based indexing)
   * Default: 1
   * Minimum: 1
   */
  page?: number;

  /**
   * Number of items per page
   * Default: 10
   * Minimum: 1
   * Maximum: 100
   */
  limit?: number;
}

/**
 * Pagination metadata in API responses
 *
 * Returned by paginated endpoints to provide information
 * about the current page and total results.
 */
export interface PaginationMeta {
  /**
   * Current page number (1-based)
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there is a next page
   */
  hasNext: boolean;

  /**
   * Whether there is a previous page
   */
  hasPrevious: boolean;
}

/**
 * Paginated response wrapper
 *
 * Generic type for paginated API responses.
 * Contains the data array and pagination metadata.
 *
 * @template T The type of items in the data array
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items for the current page
   */
  data: T[];

  /**
   * Pagination metadata
   */
  meta: PaginationMeta;
}
