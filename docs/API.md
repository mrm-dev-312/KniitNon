# KniitNon API Documentation

## Overview

KniitNon provides a comprehensive REST API for research node management, outline generation, and AI-powered content creation. The API follows RESTful principles and includes robust security, validation, and rate limiting.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication. The API supports:

- **API Key Authentication**: Include `x-api-key` header with your API key
- **JWT Authentication**: Include `Authorization: Bearer <token>` header
- **Session Authentication**: For web interface usage

```bash
# API Key example
curl -H "x-api-key: your-api-key" https://api.knitnon.com/research/nodes

# JWT example
curl -H "Authorization: Bearer your-jwt-token" https://api.knitnon.com/research/outline
```

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

| Endpoint Pattern | Limit | Window |
|-----------------|-------|---------|
| `/api/chat` | 50 requests | 1 hour |
| `/api/research/nodes` | 100 requests | 1 hour |
| `/api/research/outline` | 20 requests | 1 hour |
| `/api/research/summarize` | 30 requests | 1 hour |
| `/api/projects` | 100 requests | 1 hour |
| **Default** | 60 requests | 1 hour |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message",
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "processingTime": 45.2
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    // Additional error details
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Research Endpoints

### GET /api/research/nodes

Retrieve research nodes with filtering and pagination.

**Query Parameters:**
- `page` (integer, default: 1): Page number for pagination
- `limit` (integer, default: 10, max: 100): Number of items per page
- `search` (string): Search term for title and content
- `lens` (string): Filter by research lens (Technology, Ethics, etc.)
- `depth` (integer): Filter by node depth level
- `sortBy` (string): Sort field (title, depth, metadata.confidence)
- `sortOrder` (string): Sort order (asc, desc, default: asc)

**Example Request:**
```bash
curl "https://api.knitnon.com/research/nodes?page=1&limit=10&search=AI&lens=Technology"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "title": "Introduction to AI",
      "content": "Artificial intelligence is...",
      "type": "topic",
      "depth": 0,
      "lens": "Technology",
      "connections": ["2", "3"],
      "metadata": {
        "confidence": 0.95,
        "lastUpdated": "2024-01-15"
      }
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### POST /api/research/outline

Generate a structured outline from selected research nodes.

**Request Body:**
```json
{
  "nodeIds": ["1", "2", "3"],
  "detailLevel": "medium",
  "includeMetadata": true,
  "includeRelationships": true
}
```

**Validation Rules:**
- `nodeIds`: Required array of 1-50 node IDs
- `detailLevel`: Required enum (low, medium, high)
- `includeMetadata`: Optional boolean (default: false)
- `includeRelationships`: Optional boolean (default: true)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "detailLevel": "medium",
    "metadata": {
      "generatedAt": "2024-01-15T10:30:00.000Z",
      "nodeCount": 3,
      "estimatedReadingTime": "6 minutes"
    },
    "nodes": [
      {
        "id": "1",
        "title": "Introduction to AI",
        "content": "Expanded content at medium detail level...",
        "relationships": ["related-1-1", "related-1-2"]
      }
    ],
    "structure": {
      "totalSections": 3,
      "estimatedLength": "750 words",
      "complexity": "Intermediate"
    }
  }
}
```

### POST /api/research/conflicts

Analyze conflicts and disagreements between research nodes.

**Request Body:**
```json
{
  "nodeIds": ["1", "2", "3"],
  "detailLevel": "high"
}
```

### POST /api/research/summarize

Generate summaries for groups of research nodes.

**Request Body:**
```json
{
  "nodeIds": ["1", "2", "3"],
  "summaryType": "executive",
  "maxLength": 500
}
```

### GET /api/research/nodes/paginated

Enhanced paginated endpoint with advanced filtering.

**Query Parameters:**
- All parameters from `/api/research/nodes`
- `type` (string): Filter by node type (topic, subtopic, detail)
- `confidence` (number): Minimum confidence threshold (0-1)
- `source` (string): Filter by source

## Chat Endpoints

### POST /api/chat

Send messages to the AI chat interface.

**Request Body:**
```json
{
  "content": "What are the main ethical concerns about AI?",
  "role": "user",
  "context": {
    "selectedNodes": ["3", "5"],
    "currentProject": "ai-ethics-research"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg-123",
    "content": "The main ethical concerns about AI include...",
    "role": "assistant",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "metadata": {
      "model": "gpt-4",
      "tokens": 150,
      "processingTime": 1.2
    }
  }
}
```

## Project Management Endpoints

### GET /api/projects

List user projects with pagination.

### POST /api/projects

Create a new project.

**Request Body:**
```json
{
  "title": "AI Ethics Research",
  "description": "Comprehensive study of ethical implications",
  "nodes": [
    {
      "id": "1",
      "title": "Node title",
      "content": "Node content",
      "type": "topic"
    }
  ]
}
```

### PUT /api/projects/[id]

Update an existing project.

### DELETE /api/projects/[id]

Delete a project.

## Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Validation Error | Request validation failed |
| 401 | Authentication Error | Authentication required or failed |
| 403 | Authorization Error | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Rate Limit Exceeded | Too many requests |
| 500 | Internal Server Error | Server error occurred |

## Validation Errors

Validation errors include detailed field-level information:

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "nodeIds",
      "message": "At least one node ID required",
      "code": "too_small"
    },
    {
      "field": "detailLevel",
      "message": "Invalid enum value. Expected 'low' | 'medium' | 'high'",
      "code": "invalid_enum_value"
    }
  ]
}
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```typescript
import { KniitNonAPI } from '@knitnon/api-client';

const api = new KniitNonAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.knitnon.com'
});

// Fetch nodes
const nodes = await api.research.getNodes({
  page: 1,
  limit: 10,
  search: 'AI'
});

// Generate outline
const outline = await api.research.generateOutline({
  nodeIds: ['1', '2', '3'],
  detailLevel: 'medium'
});
```

### Python SDK

```python
from knitnon_api import KniitNonAPI

api = KniitNonAPI(api_key='your-api-key')

# Fetch nodes
nodes = api.research.get_nodes(page=1, limit=10, search='AI')

# Generate outline
outline = api.research.generate_outline(
    node_ids=['1', '2', '3'],
    detail_level='medium'
)
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Available Events
- `outline.generated`: When an outline is successfully generated
- `project.created`: When a new project is created
- `project.updated`: When a project is updated
- `conflict.detected`: When conflicts are detected between nodes

### Webhook Payload
```json
{
  "event": "outline.generated",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "outlineId": "outline-123",
    "projectId": "project-456",
    "nodeCount": 5,
    "detailLevel": "high"
  },
  "metadata": {
    "userId": "user-789",
    "version": "1.0"
  }
}
```

## Performance Considerations

- **Caching**: Responses are cached for 5 minutes for GET requests
- **Pagination**: Use pagination for large datasets (max 100 items per request)
- **Rate Limiting**: Respect rate limits to avoid throttling
- **Batch Operations**: Use batch endpoints when processing multiple items
- **Compression**: API supports gzip compression

## Security Headers

All API responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Support and Contact

- **Documentation**: [https://docs.knitnon.com](https://docs.knitnon.com)
- **Support Email**: support@knitnon.com
- **GitHub Issues**: [https://github.com/your-org/knitnon/issues](https://github.com/your-org/knitnon/issues)
- **Status Page**: [https://status.knitnon.com](https://status.knitnon.com)
