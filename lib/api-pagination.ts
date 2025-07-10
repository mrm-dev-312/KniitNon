import { NextRequest, NextResponse } from 'next/server';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links: {
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  allowedSortFields: string[];
}

const DEFAULT_CONFIG: PaginationConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  allowedSortFields: ['id', 'createdAt', 'updatedAt', 'title', 'type'],
};

/**
 * Parse pagination parameters from request URL
 */
export function parsePaginationParams(
  request: NextRequest,
  config: Partial<PaginationConfig> = {}
): PaginationParams {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    mergedConfig.maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') || mergedConfig.defaultLimit.toString(), 10))
  );

  const sort = searchParams.get('sort') || 'id';
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
  const search = searchParams.get('search') || undefined;

  // Parse filters from query params
  const filters: Record<string, any> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter[') && key.endsWith(']')) {
      const filterKey = key.slice(7, -1);
      filters[filterKey] = value;
    }
  });

  // Validate sort field
  const validSort = mergedConfig.allowedSortFields.includes(sort) ? sort : 'id';

  return {
    page,
    limit,
    sort: validSort,
    order,
    search,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginatedResponse<any>['meta'] {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Generate pagination links
 */
export function generatePaginationLinks(
  baseUrl: string,
  params: PaginationParams,
  meta: PaginatedResponse<any>['meta']
): PaginatedResponse<any>['links'] {
  const createUrl = (page: number) => {
    const url = new URL(baseUrl);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', params.limit!.toString());
    
    if (params.sort) url.searchParams.set('sort', params.sort);
    if (params.order) url.searchParams.set('order', params.order);
    if (params.search) url.searchParams.set('search', params.search);
    
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        url.searchParams.set(`filter[${key}]`, value.toString());
      });
    }
    
    return url.toString();
  };

  const links: PaginatedResponse<any>['links'] = {
    first: createUrl(1),
    last: createUrl(meta.totalPages),
  };

  if (meta.hasNext) {
    links.next = createUrl(meta.page + 1);
  }

  if (meta.hasPrev) {
    links.prev = createUrl(meta.page - 1);
  }

  return links;
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  total: number,
  baseUrl: string
): PaginatedResponse<T> {
  const meta = calculatePaginationMeta(params.page!, params.limit!, total);
  const links = generatePaginationLinks(baseUrl, params, meta);

  return {
    data,
    meta,
    links,
  };
}

/**
 * Apply pagination to array data (for in-memory datasets)
 */
export function paginateArray<T>(
  data: T[],
  params: PaginationParams
): { items: T[]; total: number } {
  let filteredData = [...data];

  // Apply search filter if provided
  if (params.search && typeof data[0] === 'object') {
    const searchLower = params.search.toLowerCase();
    filteredData = filteredData.filter((item: any) => {
      return Object.values(item).some(value => 
        value && value.toString().toLowerCase().includes(searchLower)
      );
    });
  }

  // Apply additional filters
  if (params.filters) {
    filteredData = filteredData.filter((item: any) => {
      return Object.entries(params.filters!).every(([key, value]) => {
        const itemValue = item[key];
        if (typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }
        return itemValue === value;
      });
    });
  }

  // Apply sorting
  if (params.sort && typeof data[0] === 'object') {
    filteredData.sort((a: any, b: any) => {
      const aValue = a[params.sort!];
      const bValue = b[params.sort!];
      
      if (aValue < bValue) return params.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return params.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const total = filteredData.length;

  // Apply pagination
  const offset = (params.page! - 1) * params.limit!;
  const items = filteredData.slice(offset, offset + params.limit!);

  return { items, total };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  params: PaginationParams,
  config: Partial<PaginationConfig> = {}
): { isValid: boolean; errors: string[] } {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];

  if (params.page && (params.page < 1 || !Number.isInteger(params.page))) {
    errors.push('Page must be a positive integer');
  }

  if (params.limit && (params.limit < 1 || params.limit > mergedConfig.maxLimit || !Number.isInteger(params.limit))) {
    errors.push(`Limit must be between 1 and ${mergedConfig.maxLimit}`);
  }

  if (params.sort && !mergedConfig.allowedSortFields.includes(params.sort)) {
    errors.push(`Sort field must be one of: ${mergedConfig.allowedSortFields.join(', ')}`);
  }

  if (params.order && !['asc', 'desc'].includes(params.order)) {
    errors.push('Order must be "asc" or "desc"');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Handle pagination errors
 */
export function handlePaginationError(errors: string[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Invalid pagination parameters',
      details: errors,
      status: 400,
    },
    { status: 400 }
  );
}

/**
 * Middleware for applying pagination to API routes
 */
export function withPagination<T>(
  handler: (
    request: NextRequest,
    params: PaginationParams
  ) => Promise<{ data: T[]; total: number }>,
  config?: Partial<PaginationConfig>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Parse and validate pagination parameters
      const paginationParams = parsePaginationParams(request, config);
      const validation = validatePaginationParams(paginationParams, config);

      if (!validation.isValid) {
        return handlePaginationError(validation.errors);
      }

      // Call the handler
      const result = await handler(request, paginationParams);

      // Create paginated response
      const baseUrl = new URL(request.url).origin + new URL(request.url).pathname;
      const paginatedResponse = createPaginatedResponse(
        result.data,
        paginationParams,
        result.total,
        baseUrl
      );

      return NextResponse.json(paginatedResponse);
    } catch (error) {
      console.error('Pagination error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          status: 500,
        },
        { status: 500 }
      );
    }
  };
}

export default {
  parsePaginationParams,
  calculatePaginationMeta,
  generatePaginationLinks,
  createPaginatedResponse,
  paginateArray,
  validatePaginationParams,
  handlePaginationError,
  withPagination,
};
