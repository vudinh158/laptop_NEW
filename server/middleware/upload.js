const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Storage cho thumbnail
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'laptop-store/thumbnails',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// Storage cho category icons
const categoryIconStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'laptop-store/categories',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'svg'],
  },
});

// Storage cho brand logos
const brandLogoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'laptop-store/brands',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'svg'],
  },
});

// Storage cho product images
const productImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'laptop-store/products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

// Middleware upload cho thumbnail
const uploadThumbnail = multer({ storage: thumbnailStorage });

// Middleware upload cho product images (nhiều ảnh)
const uploadProductImages = multer({ storage: productImageStorage });

// Middleware hỗ trợ upload đồng thời thumbnail và product_images
const uploadProductFiles = multer({
  storage: productImageStorage, // Sử dụng chung storage
}).fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'product_images', maxCount: 10 } // Tối đa 10 ảnh sản phẩm
]);

// Middleware upload cho category icon
const uploadCategoryIcon = multer({ storage: categoryIconStorage }).single('icon');

// Middleware upload cho brand logo
const uploadBrandLogo = multer({ storage: brandLogoStorage }).single('logo');

// Middleware chung cho category/brand (sử dụng thumbnail field cho backward compatibility)
const uploadCategoryFiles = multer({ storage: categoryIconStorage }).single('thumbnail');
const uploadBrandFiles = multer({ storage: brandLogoStorage }).single('thumbnail');

module.exports = {
  uploadThumbnail,
  uploadProductImages,
  uploadProductFiles,
  uploadCategoryIcon,
  uploadBrandLogo,
  uploadCategoryFiles,
  uploadBrandFiles,
  // Giữ lại upload cũ để tương thích ngược
  upload: multer({ storage: productImageStorage })
};