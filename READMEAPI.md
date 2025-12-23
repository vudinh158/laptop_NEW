# API Endpoints List

## Authentication (/api/auth)

### POST /api/auth/register
**Request Body:**
```json
{
  "username": "string (3-50 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)",
  "full_name": "string (optional, max 100 chars)",
  "phone_number": "string (valid phone format)"
}
```
**Response Body:**
```json
{
  "message": "User registered successfully",
  "token": "string (JWT token)",
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "phone_number": "string",
    "roles": ["string"]
  }
}
```

### POST /api/auth/register-email
**Request Body:**
```json
{
  "username": "string (3-50 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)",
  "full_name": "string (optional, max 100 chars)",
  "phone_number": "string (valid phone format)"
}
```
**Response Body:**
```json
{
  "message": "Verification email sent"
}
```

### GET /api/auth/verify-email?token=<token>
**Request Body:** None
**Response Body:** Redirect to frontend URL

### POST /api/auth/login
**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```
**Response Body:**
```json
{
  "message": "Login successful",
  "token": "string (JWT token)",
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "phone_number": "string",
    "avatar_url": "string",
    "roles": ["string"]
  }
}
```

### POST /api/auth/forgot-password
**Request Body:**
```json
{
  "email": "string (valid email)"
}
```
**Response Body:**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

### GET /api/auth/reset-password/verify?token=<token>
**Request Body:** None
**Response Body:** Redirect to frontend URL

### POST /api/auth/reset-password
**Request Body:**
```json
{
  "token": "string",
  "password": "string (min 6 chars)"
}
```
**Response Body:**
```json
{
  "message": "Password updated successfully"
}
```

### GET /api/auth/me
**Request Body:** None
**Response Body:**
```json
{
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "phone_number": "string",
    "address": "string",
    "avatar_url": "string",
    "roles": ["string"]
  }
}
```

### PUT /api/auth/profile
**Request Body:**
```json
{
  "full_name": "string (optional)",
  "phone_number": "string (optional)",
  "address": "string (optional)",
  "avatar_url": "string (optional)"
}
```
**Response Body:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string",
    "full_name": "string",
    "phone_number": "string",
    "address": "string",
    "avatar_url": "string"
  }
}
```

### GET /api/auth/google
**Request Body:** None
**Response Body:** Redirect to Google OAuth

### GET /api/auth/google/callback
**Request Body:** None
**Response Body:** Redirect to frontend with token

### GET /api/auth/facebook
**Request Body:** None
**Response Body:** Redirect to Facebook OAuth

### GET /api/auth/facebook/callback
**Request Body:** None
**Response Body:** Redirect to frontend with token

...........................................................................................................................................
## Products (/api/products)

### GET /api/products/facets
**Request Body:** None
**Response Body:**
```json
{
  "facets": {
    "processor": ["string"],
    "ram": ["string"],
    "storage": ["string"],
    "graphics_card": ["string"],
    "screen_size": ["string"],
    "weight": ["string"]
  }
}
```

### GET /api/products/v2
**Query Parameters:**
- page (number, default: 1)
- limit (number, default: 12)
- category_id (number or array)
- brand_id (number or array)
- min_price (number), max_price (number)
- processor (string or array)
- ram (string or array)
- storage (string or array)
- graphics_card (string or array)
- screen_size (string or array)
- min_weight (number), max_weight (number)
- search (string)
- sort_by (string: price_asc, price_desc, newest, best_selling)
**Request Body:** None
**Response Body:**
```json
{
  "products": [
    {
      "product_id": "number",
      "product_name": "string",
      "base_price": "number",
      "thumbnail_url": "string",
      "discount_percentage": "number",
      "category": {
        "category_id": "number",
        "category_name": "string",
        "slug": "string"
      },
      "brand": {
        "brand_id": "number",
        "brand_name": "string",
        "slug": "string",
        "logo_url": "string"
      },
      "variations": [
        {
          "variation_id": "number",
          "price": "number",
          "stock_quantity": "number"
        }
      ],
      "images": [
        {
          "image_url": "string"
        }
      ]
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  },
  "total": "number",
  "totalPages": "number"
}
```

### GET /api/products/search-suggestions?q=<query>
**Query Parameters:**
- q (string, min 2 chars)
**Request Body:** None
**Response Body:**
```json
{
  "products": [
    {
      "product_id": "number",
      "product_name": "string",
      "slug": "string",
      "thumbnail_url": "string",
      "base_price": "number",
      "discount_percentage": "number",
      "variations": [
        {
          "price": "number"
        }
      ],
      "images": [
        {
          "image_url": "string"
        }
      ]
    }
  ]
}
```

### GET /api/products/
**Request Body:** None
**Response Body:** Same as GET /api/products/v2

### GET /api/products/categories
**Request Body:** None
**Response Body:**
```json
{
  "categories": [
    {
      "category_id": "number",
      "category_name": "string",
      "slug": "string",
      "icon_url": "string",
      "display_order": "number"
    }
  ]
}
```

### GET /api/products/brands
**Request Body:** None
**Response Body:**
```json
{
  "brands": [
    {
      "brand_id": "number",
      "brand_name": "string",
      "slug": "string",
      "logo_url": "string"
    }
  ]
}
```

### GET /api/products/questions
**Query Parameters:**
- page (number, default: 1)
- limit (number, default: 10)
**Request Body:** None
**Response Body:**
```json
{
  "questions": [
    {
      "question_id": "number",
      "question_text": "string",
      "is_answered": "boolean",
      "created_at": "string",
      "user": {
        "user_id": "number",
        "username": "string",
        "full_name": "string"
      }
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### POST /api/products/questions
**Request Body:**
```json
{
  "question_text": "string (required)"
}
```
**Response Body:**
```json
{
  "question": {
    "question_id": "number",
    "question_text": "string",
    "is_answered": "boolean",
    "created_at": "string",
    "user": {
      "user_id": "number",
      "username": "string",
      "full_name": "string"
    }
  }
}
```

### GET /api/products/:id
**Path Parameters:**
- id (number or string: product_id or slug)
**Request Body:** None
**Response Body:**
```json
{
  "product": {
    "product_id": "number",
    "product_name": "string",
    "slug": "string",
    "description": "string",
    "base_price": "number",
    "thumbnail_url": "string",
    "specs": "object",
    "is_active": "boolean",
    "category": "object",
    "brand": "object",
    "variations": [
      {
        "variation_id": "number",
        "price": "number",
        "stock_quantity": "number",
        "is_available": "boolean",
        "processor": "string",
        "ram": "string",
        "storage": "string",
        "graphics_card": "string",
        "screen_size": "string",
        "color": "string"
      }
    ],
    "images": [
      {
        "image_url": "string",
        "display_order": "number"
      }
    ],
    "questions": ["array"]
  }
}
```

### GET /api/products/variations/:variation_id/recommendations
**Path Parameters:**
- variation_id (number)
**Request Body:** None
**Response Body:**
```json
{
  "products": [
    {
      "product_id": "number",
      "variation_id": "number",
      "score": "number",
      "product_name": "string",
      "thumbnail_url": "string"
    }
  ],
  "basedOn": {
    "variationId": "number"
  },
  "source": "string"
}
```

### GET /api/products/compare?ids=<ids>
**Query Parameters:**
- ids (string: comma-separated product IDs)
**Request Body:** None
**Response Body:**
```json
{
  "products": [
    {
      "product_id": "number",
      "product_name": "string",
      "thumbnail_url": "string",
      "base_price": "number",
      "discount_percentage": "number",
      "specs": "object"
    }
  ],
  "comparison": {
    "groups": [
      {
        "group": "string",
        "labels": ["string"],
        "matrix": [["string"]]
      }
    ]
  }
}
```

### POST /api/products/compare
**Request Body:**
```json
{
  "ids": ["number"]
}
```
**Response Body:** Same as GET /api/products/compare

### POST /api/products/:id/questions
**Path Parameters:**
- id (number or string: product_id or slug)
**Request Body:**
```json
{
  "question_text": "string (required)",
  "parent_question_id": "number (optional)"
}
```
**Response Body:**
```json
{
  "question": {
    "question_id": "number",
    "question_text": "string",
    "is_answered": "boolean",
    "created_at": "string",
    "parent_question_id": "number",
    "user": {
      "user_id": "number",
      "username": "string",
      "full_name": "string"
    }
  }
}
```

### POST /api/products/questions/:question_id/answers
**Path Parameters:**
- question_id (number)
**Request Body:**
```json
{
  "answer_text": "string (required)"
}
```
**Response Body:**
```json
{
  "answer": {
    "answer_id": "number",
    "answer_text": "string",
    "created_at": "string",
    "user": {
      "user_id": "number",
      "username": "string",
      "full_name": "string"
    }
  }
}
```
.............................................................................................................................................
## Cart (/api/cart)

### GET /api/cart/
**Request Body:** None
**Response Body:**
```json
{
  "cart": {
    "cart_id": "number",
    "item_count": "number",
    "items": [
      {
        "cart_item_id": "number",
        "variation_id": "number",
        "quantity": "number",
        "price_at_add": "number",
        "variation": {
          "stock_quantity": "number",
          "is_available": "boolean",
          "processor": "string",
          "ram": "string",
          "storage": "string"
        },
        "product": {
          "product_id": "number",
          "product_name": "string",
          "thumbnail_url": "string",
          "discount_percentage": "number",
          "variation": {
            "price": "number"
          }
        },
        "unit_price_before_discount": "number",
        "discount_percentage": "number",
        "unit_price_after_discount": "number",
        "line_total_after_discount": "number"
      }
    ],
    "subtotal_snapshot": "number",
    "subtotal_after_discount": "number"
  }
}
```

### POST /api/cart/
**Request Body:**
```json
{
  "variation_id": "number (required)",
  "quantity": "number (default: 1)"
}
```
**Response Body:** Same as GET /api/cart/

### PUT /api/cart/:cart_item_id
**Path Parameters:**
- cart_item_id (number)
**Request Body:**
```json
{
  "quantity": "number (required)",
  "variation_id": "number (optional)",
  "cart_item_id": "number (optional)"
}
```
**Response Body:** Same as GET /api/cart/

### DELETE /api/cart/:cart_item_id
**Path Parameters:**
- cart_item_id (number)
**Request Body:** None
**Response Body:** Same as GET /api/cart/

### DELETE /api/cart/
**Request Body:** None
**Response Body:** Same as GET /api/cart/
.............................................................................................................................................
## Orders (/api/orders)

### POST /api/orders/
**Request Body:**
```json
{
  "shipping_address": "string (required)",
  "shipping_phone": "string (required)",
  "shipping_name": "string (required)",
  "note": "string (optional)",
  "payment_provider": "string (required: COD|VNPAY)",
  "payment_method": "string (required: COD|VNPAYQR|VNBANK|INTCARD|INSTALLMENT)",
  "items": [
    {
      "variation_id": "number (required)",
      "quantity": "number (required)"
    }
  ],
  "province_id": "number (required)",
  "ward_id": "number (required)",
  "geo_lat": "number (required)",
  "geo_lng": "number (required)"
}
```
**Response Body:**
```json
{
  "message": "Order created successfully",
  "order": {
    "order_id": "number",
    "order_code": "string",
    "status": "string",
    "final_amount": "number",
    "shipping_fee": "number",
    "created_at": "string"
  },
  "payment_url": "string (optional, for VNPAY)"
}
```

### GET /api/orders/counters
**Request Body:** None
**Response Body:**
```json
{
  "counters": {
    "all": "number",
    "awaiting_payment": "number",
    "to_ship": "number",
    "shipping": "number",
    "completed": "number",
    "cancelled": "number",
    "failed": "number"
  }
}
```

### POST /api/orders/:order_id/payment-method
**Path Parameters:**
- order_id (number)
**Request Body:**
```json
{
  "provider": "string (required: COD|VNPAY)",
  "method": "string (required: COD|VNPAYQR|VNBANK|INTCARD|INSTALLMENT)"
}
```
**Response Body:**
```json
{
  "message": "Payment method updated",
  "order": {
    "order_id": "number",
    "status": "string",
    "payment": {
      "provider": "string",
      "payment_method": "string",
      "payment_status": "string"
    }
  },
  "payment_url": "string (optional, for VNPAY)"
}
```

### PUT /api/orders/:order_id/shipping-address
**Path Parameters:**
- order_id (number)
**Request Body:**
```json
{
  "shipping_name": "string (required)",
  "shipping_phone": "string (required)",
  "shipping_address": "string (required)",
  "province_id": "number (required)",
  "ward_id": "number (required)",
  "geo_lat": "number (required)",
  "geo_lng": "number (required)"
}
```
**Response Body:**
```json
{
  "message": "Shipping address updated",
  "order": {
    "order_id": "number",
    "shipping_name": "string",
    "shipping_phone": "string",
    "shipping_address": "string",
    "province_id": "number",
    "ward_id": "number",
    "final_amount": "number",
    "shipping_fee": "number"
  }
}
```

### GET /api/orders/
**Query Parameters:**
- tab (string: all|awaiting_payment|to_ship|shipping|completed|cancelled|failed)
- page (number, default: 1)
- limit (number, default: 10)
- q (string: search query)
- sort (string: created_at:desc|created_at:asc)
**Request Body:** None
**Response Body:**
```json
{
  "orders": [
    {
      "order_id": "number",
      "order_code": "string",
      "status": "string",
      "final_amount": "number",
      "shipping_fee": "number",
      "created_at": "string",
      "reserve_expires_at": "string",
      "payment": {
        "provider": "string",
        "payment_method": "string",
        "payment_status": "string",
        "txn_ref": "string"
      },
      "items_preview": [
        {
          "variation_id": "number",
          "quantity": "number",
          "product_name": "string",
          "thumbnail_url": "string"
        }
      ],
      "items_count": "number"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### GET /api/orders/:order_id
**Path Parameters:**
- order_id (number)
**Request Body:** None
**Response Body:**
```json
{
  "order": {
    "order_id": "number",
    "order_code": "string",
    "status": "string",
    "final_amount": "number",
    "shipping_fee": "number",
    "created_at": "string",
    "shipping_name": "string",
    "shipping_phone": "string",
    "shipping_address": "string",
    "note": "string",
    "province_id": "number",
    "ward_id": "number",
    "geo_lat": "number",
    "geo_lng": "number",
    "items": [
      {
        "variation_id": "number",
        "quantity": "number",
        "price_at_order": "number",
        "variation": {
          "processor": "string",
          "ram": "string",
          "storage": "string",
          "graphics_card": "string",
          "screen_size": "string",
          "color": "string",
          "product": {
            "product_name": "string",
            "thumbnail_url": "string"
          }
        }
      }
    ],
    "payment": {
      "provider": "string",
      "payment_method": "string",
      "payment_status": "string",
      "amount": "number",
      "txn_ref": "string"
    }
  }
}
```

### POST /api/orders/:order_id/cancel
**Path Parameters:**
- order_id (number)
**Request Body:**
```json
{
  "reason": "string (optional)"
}
```
**Response Body:**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "order_id": "number",
    "status": "string",
    "cancelled_at": "string",
    "cancel_reason": "string"
  }
}
```

### POST /api/orders/preview
**Request Body:**
```json
{
  "items": [
    {
      "variation_id": "number (required)",
      "quantity": "number (default: 1)"
    }
  ],
  "province_id": "number (required)",
  "ward_id": "number (optional)"
}
```
**Response Body:**
```json
{
  "total_amount": "number",
  "discount_amount": "number",
  "subtotal_after_discount": "number",
  "shipping_fee": "number",
  "shipping_reason": "string",
  "final_amount": "number",
  "items_breakdown": [
    {
      "variation_id": "number",
      "product_name": "string",
      "quantity": "number",
      "unit_price": "number",
      "unit_discount_amount": "number",
      "unit_final_price": "number",
      "item_total": "number",
      "item_discount": "number",
      "item_subtotal_after_discount": "number",
      "thumbnail_url": "string",
      "slug": "string"
    }
  ],
  "stock_warnings": [
    {
      "variation_id": "number",
      "message": "string"
    }
  ]
}
```

### GET /api/orders/:order_id/slim
**Path Parameters:**
- order_id (number)
**Request Body:** None
**Response Body:**
```json
{
  "order": {
    "order_id": "number",
    "order_code": "string",
    "status": "string",
    "final_amount": "number",
    "created_at": "string",
    "items": [
      {
        "variation_id": "number",
        "quantity": "number",
        "variation": {
          "product": {
            "product_name": "string",
            "thumbnail_url": "string"
          }
        }
      }
    ]
  }
}
```

### POST /api/orders/:order_id/payments/retry
**Path Parameters:**
- order_id (number)
**Request Body:** None
**Response Body:**
```json
{
  "message": "Payment retry initiated",
  "payment_url": "string",
  "order": {
    "order_id": "number",
    "payment": {
      "txn_ref": "string",
      "payment_status": "string"
    }
  }
}
```
...............................................................................................................................................
## Admin (/api/admin)

### POST /api/admin/products
**Request Body (multipart/form-data):**
```json
{
  "product_name": "string (required)",
  "slug": "string (required)",
  "description": "string (optional)",
  "category_id": "number (required)",
  "brand_id": "number (required)",
  "base_price": "number (required)",
  "discount_percentage": "number (optional)",
  "thumbnail_url": "string (optional)",
  "variations": [
    {
      "price": "number (required)",
      "stock_quantity": "number (required)",
      "is_available": "boolean (default: true)",
      "processor": "string (optional)",
      "ram": "string (optional)",
      "storage": "string (optional)",
      "graphics_card": "string (optional)",
      "screen_size": "string (optional)",
      "color": "string (optional)"
    }
  ],
  "images": [
    {
      "image_url": "string (required)",
      "is_primary": "boolean (optional)"
    }
  ]
}
```
**Response Body:**
```json
{
  "message": "Product created successfully",
  "product": {
    "product_id": "number",
    "product_name": "string",
    "slug": "string",
    "description": "string",
    "category_id": "number",
    "brand_id": "number",
    "base_price": "number",
    "discount_percentage": "number",
    "thumbnail_url": "string",
    "is_active": "boolean",
    "created_at": "string"
  }
}
```

### PUT /api/admin/products/:product_id
**Path Parameters:**
- product_id (number)
**Request Body (multipart/form-data):**
```json
{
  "product_name": "string (optional)",
  "slug": "string (optional)",
  "description": "string (optional)",
  "category_id": "number (optional)",
  "brand_id": "number (optional)",
  "base_price": "number (optional)",
  "discount_percentage": "number (optional)",
  "is_active": "boolean (optional)",
  "variations": [
    {
      "variation_id": "number (optional)",
      "price": "number (optional)",
      "stock_quantity": "number (optional)",
      "is_available": "boolean (optional)",
      "processor": "string (optional)",
      "ram": "string (optional)",
      "storage": "string (optional)",
      "graphics_card": "string (optional)",
      "screen_size": "string (optional)",
      "color": "string (optional)"
    }
  ]
}
```
**Response Body:**
```json
{
  "message": "Product updated successfully",
  "product": {
    "product_id": "number",
    "product_name": "string",
    "slug": "string",
    "description": "string",
    "category_id": "number",
    "brand_id": "number",
    "base_price": "number",
    "discount_percentage": "number",
    "thumbnail_url": "string",
    "is_active": "boolean",
    "updated_at": "string"
  }
}
```

### DELETE /api/admin/products/:product_id
**Path Parameters:**
- product_id (number)
**Request Body:** None
**Response Body:**
```json
{
  "message": "Product deleted successfully"
}
```

### POST /api/admin/products/:product_id/variations
**Path Parameters:**
- product_id (number)
**Request Body:**
```json
{
  "price": "number (required)",
  "stock_quantity": "number (required)",
  "is_available": "boolean (default: true)",
  "processor": "string (optional)",
  "ram": "string (optional)",
  "storage": "string (optional)",
  "graphics_card": "string (optional)",
  "screen_size": "string (optional)",
  "color": "string (optional)"
}
```
**Response Body:**
```json
{
  "message": "Variation created successfully",
  "variation": {
    "variation_id": "number",
    "product_id": "number",
    "price": "number",
    "stock_quantity": "number",
    "is_available": "boolean",
    "processor": "string",
    "ram": "string",
    "storage": "string",
    "graphics_card": "string",
    "screen_size": "string",
    "color": "string",
    "created_at": "string"
  }
}
```

### PUT /api/admin/variations/:variation_id
**Path Parameters:**
- variation_id (number)
**Request Body:**
```json
{
  "price": "number (optional)",
  "stock_quantity": "number (optional)",
  "is_available": "boolean (optional)",
  "processor": "string (optional)",
  "ram": "string (optional)",
  "storage": "string (optional)",
  "graphics_card": "string (optional)",
  "screen_size": "string (optional)",
  "color": "string (optional)"
}
```
**Response Body:**
```json
{
  "message": "Variation updated successfully",
  "variation": {
    "variation_id": "number",
    "product_id": "number",
    "price": "number",
    "stock_quantity": "number",
    "is_available": "boolean",
    "processor": "string",
    "ram": "string",
    "storage": "string",
    "graphics_card": "string",
    "screen_size": "string",
    "color": "string",
    "updated_at": "string"
  }
}
```

### GET /api/admin/orders
**Query Parameters:**
- page (number, default: 1)
- limit (number, default: 20)
- status (string: optional filter)
**Request Body:** None
**Response Body:**
```json
{
  "orders": [
    {
      "order_id": "number",
      "order_code": "string",
      "status": "string",
      "final_amount": "number",
      "created_at": "string",
      "user": {
        "user_id": "number",
        "username": "string",
        "email": "string",
        "full_name": "string",
        "phone_number": "string"
      }
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### PUT /api/admin/orders/:order_id/status
**Path Parameters:**
- order_id (number)
**Request Body:**
```json
{
  "status": "string (required: AWAITING_PAYMENT|processing|shipping|delivered|cancelled|FAILED)"
}
```
**Response Body:**
```json
{
  "message": "Order status updated successfully",
  "order": {
    "order_id": "number",
    "order_code": "string",
    "status": "string",
    "final_amount": "number",
    "updated_at": "string"
  }
}
```

### GET /api/admin/users
**Query Parameters:**
- page (number, default: 1)
- limit (number, default: 20)
- sort (string: user_id|username|created_at|last_login|email, default: created_at)
- order (string: ASC|DESC, default: DESC)
**Request Body:** None
**Response Body:**
```json
{
  "users": [
    {
      "user_id": "number",
      "username": "string",
      "email": "string",
      "full_name": "string",
      "phone_number": "string",
      "address": "string",
      "avatar_url": "string",
      "is_active": "boolean",
      "created_at": "string",
      "last_login": "string",
      "Roles": [
        {
          "role_id": "number",
          "role_name": "string"
        }
      ]
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

### PUT /api/admin/users/:user_id/status
**Path Parameters:**
- user_id (number)
**Request Body:**
```json
{
  "is_active": "boolean (required)"
}
```
**Response Body:**
```json
{
  "message": "User status updated successfully",
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string",
    "is_active": "boolean",
    "updated_at": "string"
  }
}
```

### GET /api/admin/categories
**Request Body:** None
**Response Body:**
```json
{
  "categories": [
    {
      "category_id": "number",
      "category_name": "string",
      "slug": "string",
      "icon_url": "string",
      "display_order": "number",
      "is_active": "boolean"
    }
  ]
}
```

### POST /api/admin/categories
**Request Body:**
```json
{
  "category_name": "string (required)",
  "slug": "string (required)",
  "icon_url": "string (optional)",
  "display_order": "number (optional)",
  "is_active": "boolean (default: true)"
}
```
**Response Body:**
```json
{
  "message": "Category created successfully",
  "category": {
    "category_id": "number",
    "category_name": "string",
    "slug": "string",
    "icon_url": "string",
    "display_order": "number",
    "is_active": "boolean",
    "created_at": "string"
  }
}
```

### PUT /api/admin/categories/:category_id
**Path Parameters:**
- category_id (number)
**Request Body:**
```json
{
  "category_name": "string (optional)",
  "slug": "string (optional)",
  "icon_url": "string (optional)",
  "display_order": "number (optional)",
  "is_active": "boolean (optional)"
}
```
**Response Body:**
```json
{
  "message": "Category updated successfully",
  "category": {
    "category_id": "number",
    "category_name": "string",
    "slug": "string",
    "icon_url": "string",
    "display_order": "number",
    "is_active": "boolean",
    "updated_at": "string"
  }
}
```

### DELETE /api/admin/categories/:category_id
**Path Parameters:**
- category_id (number)
**Request Body:** None
**Response Body:**
```json
{
  "message": "Category deleted successfully"
}
```

### POST /api/admin/brands
**Request Body:**
```json
{
  "brand_name": "string (required)",
  "slug": "string (required)",
  "logo_url": "string (optional)",
  "is_active": "boolean (default: true)"
}
```
**Response Body:**
```json
{
  "message": "Brand created successfully",
  "brand": {
    "brand_id": "number",
    "brand_name": "string",
    "slug": "string",
    "logo_url": "string",
    "is_active": "boolean",
    "created_at": "string"
  }
}
```

### PUT /api/admin/brands/:brand_id
**Path Parameters:**
- brand_id (number)
**Request Body:**
```json
{
  "brand_name": "string (optional)",
  "slug": "string (optional)",
  "logo_url": "string (optional)",
  "is_active": "boolean (optional)"
}
```
**Response Body:**
```json
{
  "message": "Brand updated successfully",
  "brand": {
    "brand_id": "number",
    "brand_name": "string",
    "slug": "string",
    "logo_url": "string",
    "is_active": "boolean",
    "updated_at": "string"
  }
}
```
.............................................................................................................................................
## Geo (/api)

### GET /api/provinces
**Request Body:** None
**Response Body:**
```json
[
  {
    "province_id": "number",
    "name": "string",
    "slug": "string",
    "is_hcm": "boolean",
    "base_shipping_fee": "number",
    "is_free_shipping": "boolean",
    "max_shipping_fee": "number"
  }
]
```

### GET /api/provinces/:id/wards
**Path Parameters:**
- id (number: province_id)
**Request Body:** None
**Response Body:**
```json
[
  {
    "ward_id": "number",
    "name": "string",
    "slug": "string",
    "extra_fee": "number",
    "province_id": "number"
  }
]
```

## Payment (/api)

### POST /api/vnpay/create_payment_url
**Request Body:**
```json
{
  "orderId": "string (required)",
  "amount": "number (required)"
}
```
**Response Body:**
```json
{
  "url": "string (VNPAY payment URL)"
}
```

### GET /api/vnpay/return
**Query Parameters:**
- All VNPAY return parameters (vnp_ResponseCode, vnp_TxnRef, etc.)
**Request Body:** None
**Response Body:** Redirect to frontend URL with payment status

## Shipping (/api)

### GET /api/quote
**Query Parameters:**
- province_id (number, required)
- ward_id (number, optional)
- subtotal (number, default: 0)
**Request Body:** None
**Response Body:**
```json
{
  "shipping_fee": "number",
  "reason": "string (optional: FREE_BY_PROVINCE|HCM_SUBTOTAL_FREE|NO_PROVINCE)"
}
```

## Questions Management (Admin Only)

### GET /api/admin/questions
**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page
- `answered` (string): Filter by answer status ('true' or 'false')
- `has_product` (string): Filter by product relation ('true' or 'false')
- `sort_by` (string, default: 'created_at'): Sort field ('created_at', 'updated_at', 'question_id')
- `sort_order` (string, default: 'DESC'): Sort order ('ASC' or 'DESC')

**Response:**
```json
{
  "questions": [
    {
      "question_id": 1,
      "question_text": "How to use this product?",
      "is_answered": true,
      "created_at": "2025-12-23T05:00:00.000Z",
      "updated_at": "2025-12-23T05:30:00.000Z",
      "user": {
        "user_id": 1,
        "username": "john_doe",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "product": {
        "product_id": 1,
        "product_name": "Sample Product"
      },
      "answers": [
        {
          "answer_id": 1,
          "answer_text": "Here's how to use it...",
          "created_at": "2025-12-23T05:30:00.000Z",
          "user": {
            "user_id": 2,
            "username": "admin",
            "full_name": "Admin User"
          }
        }
      ]
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### GET /api/admin/questions/:question_id
**Response:**
```json
{
  "question": {
    "question_id": 1,
    "question_text": "How to use this product?",
    "is_answered": true,
    "created_at": "2025-12-23T05:00:00.000Z",
    "updated_at": "2025-12-23T05:30:00.000Z",
    "user": {
      "user_id": 1,
      "username": "john_doe",
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "product": {
      "product_id": 1,
      "product_name": "Sample Product"
    },
    "answers": [
      {
        "answer_id": 1,
        "answer_text": "Here's how to use it...",
        "created_at": "2025-12-23T05:30:00.000Z",
        "updated_at": "2025-12-23T05:30:00.000Z",
        "user": {
          "user_id": 2,
          "username": "admin",
          "full_name": "Admin User"
        }
      }
    ]
  }
}
```

### POST /api/admin/questions/:question_id/answers
**Request Body:**
```json
{
  "answer_text": "This is my answer to the question."
}
```

**Response:**
```json
{
  "message": "Answer created successfully",
  "answer": {
    "answer_id": 1,
    "answer_text": "This is my answer to the question.",
    "question_id": 1,
    "user_id": 2,
    "created_at": "2025-12-23T05:30:00.000Z",
    "updated_at": "2025-12-23T05:30:00.000Z",
    "user": {
      "user_id": 2,
      "username": "admin",
      "full_name": "Admin User"
    }
  }
}
```

### PUT /api/admin/questions/:question_id/answers/:answer_id
**Request Body:**
```json
{
  "answer_text": "Updated answer text."
}
```

**Response:**
```json
{
  "message": "Answer updated successfully",
  "answer": {
    "answer_id": 1,
    "answer_text": "Updated answer text.",
    "updated_at": "2025-12-23T05:35:00.000Z"
  }
}
```

### DELETE /api/admin/questions/:question_id/answers/:answer_id
**Response:**
```json
{
  "message": "Answer deleted successfully"
}
```

## API Endpoints Navigation

### Admin Endpoints
- [Admin] - Analytics & Dashboard
- [Admin] - Orders Management
- [Admin] - Users Management
- [Admin] - Categories Management
- [Admin] - Products Management
- [Admin] - Questions & Answers (Q&A)

### Public Endpoints
- [Authentication] - Login, Register, OAuth
- [Products] - CRUD, Search, Categories
- [Cart] - Add, Update, Remove Items
- [Orders] - Create, List, Cancel Orders
- [Geo] - Provinces & Wards
- [Payment] - VNPAY Integration
- [Shipping] - Shipping Calculation
- [Health Check]

## Health Check

### GET /api/health
**Request Body:** None
**Response Body:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```
