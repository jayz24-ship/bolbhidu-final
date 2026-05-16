# Trending Issues API

## Overview
The Trending Issues feature allows users to discover popular posts from their geographical area, helping them stay informed about pressing local issues.

## Endpoints

### 1. GET /posts/trending
Get trending posts based on engagement within the user's area.

**Query Parameters:**
- `lat` (number): User's latitude 
- `lng` (number): User's longitude
- `radiusKm` (number, optional): Search radius in kilometers (default: 25km from env)
- `timeframe` (string, optional): Time period - `1d`, `7d`, `30d` (default: `7d`)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Response:**
```json
{
  "items": [
    {
      "id": "post_id",
      "userId": "user_id", 
      "username": "User Name",
      "userAvatar": "avatar_url",
      "description": "Post content",
      "category": "roads",
      "location": "Area Name", 
      "mediaUrl": "image_url",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "likes": 15,
      "comments": 8, 
      "shares": 3,
      "isLiked": false,
      "isRegisteredAsIssue": true,
      "engagementScore": 42,
      "trendingRank": 1,
      "timeframe": "7d",
      "distance": "2.5km"
    }
  ],
  "hasMore": true,
  "page": 1,
  "totalPages": 5,
  "meta": {
    "timeframe": "7d",
    "radiusKm": 25,
    "coordinates": { "lat": 18.75, "lng": 73.85 },
    "totalTrendingPosts": 89
  }
}
```

### 2. GET /posts/trending/categories  
Get trending statistics by category within the user's area.

**Query Parameters:**
- `lat` (number): User's latitude
- `lng` (number): User's longitude  
- `radiusKm` (number, optional): Search radius in kilometers
- `timeframe` (string, optional): Time period - `1d`, `7d`, `30d`

**Response:**
```json
{
  "categories": [
    {
      "category": "roads",
      "displayName": "Roads & Traffic",
      "stats": {
        "totalPosts": 25,
        "totalLikes": 150,
        "totalComments": 89,
        "totalShares": 34,
        "totalEngagement": 423,
        "avgEngagement": 16.9,
        "trendingScore": 473
      },
      "latestActivity": "2025-01-01T00:00:00.000Z",
      "trend": "hot"
    }
  ],
  "meta": {
    "timeframe": "7d", 
    "radiusKm": 25,
    "coordinates": { "lat": 18.75, "lng": 73.85 },
    "totalCategories": 6
  }
}
```

## Features

### Geospatial Intelligence
- **Location-based**: Shows trending issues within specified radius
- **Fallback**: Gracefully falls back to global trends if coordinates invalid
- **Distance tracking**: Shows approximate distance to each post
- **Same geospatial robustness**: Uses identical validation as main feed

### Engagement Ranking  
- **Multi-factor scoring**: Combines likes, comments, shares, and engagement score
- **Recency factor**: Prioritizes recent activity within timeframe
- **Volume bonus**: Categories with more posts get trending boost

### Time-based Filtering
- **Flexible timeframes**: 1 day, 7 days, or 30 days
- **Recent activity**: Only shows posts with engagement in selected period
- **Fresh content**: Ensures trending reflects current issues

### Trend Indicators
- **hot**: High engagement + many posts (score >50, posts >5)
- **rising**: Growing engagement (score >20, posts >2) 
- **stable**: Consistent activity (posts >0)
- **quiet**: Low/no activity

## Frontend Integration

### Trending Tab Component
```javascript
// Fetch trending posts
const response = await fetch(`/posts/trending?lat=${lat}&lng=${lng}&radiusKm=25&timeframe=7d&limit=10`);
const { items, meta } = await response.json();

// Show posts with trending indicators
items.forEach(post => {
  console.log(`#${post.trendingRank}: ${post.description}`);
  console.log(`Distance: ${post.distance}, Engagement: ${post.engagementScore}`);
});
```

### Category Overview
```javascript  
// Fetch category trends
const response = await fetch(`/posts/trending/categories?lat=${lat}&lng=${lng}&timeframe=7d`);
const { categories } = await response.json();

// Display category heatmap
categories.forEach(cat => {
  console.log(`${cat.displayName}: ${cat.stats.totalPosts} posts (${cat.trend})`);
});
```

## Error Handling
- **Coordinate validation**: Same robust validation as main feed
- **Graceful fallbacks**: Shows global trends if geospatial fails  
- **Empty states**: Proper handling when no trending posts exist
- **Performance optimization**: Uses proper indexes and aggregation

## Performance Notes
- **Indexed queries**: Leverages 2dsphere index for fast geospatial queries
- **Aggregation pipeline**: Efficient category statistics calculation
- **Caching friendly**: Stable results within timeframe windows
- **Pagination**: Memory-efficient pagination for large result sets

The trending system provides valuable insights into local community issues while maintaining the same bulletproof geospatial reliability as the main feed.