import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../data/products.json");
const CATEGORIES_FILE = path.resolve(__dirname, "../data/categories.json");
const LOOKBOOK_FILE = path.resolve(__dirname, "../data/lookbook.json");
const SCHOOL_FILE = path.resolve(__dirname, "../data/school.json");
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "moghene-dev-secret";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@moghene.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "moghene2026";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const CLOUDINARY_CLOUD_NAME = cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
const CLOUDINARY_API_KEY = cleanEnvValue(process.env.CLOUDINARY_API_KEY);
const CLOUDINARY_API_SECRET = cleanEnvValue(process.env.CLOUDINARY_API_SECRET);

function cleanEnvValue(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((item) => cleanEnvValue(item))
  .filter(Boolean);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_request, file, callback) {
    if (file.mimetype?.startsWith("image/")) {
      callback(null, true);
      return;
    }
    callback(new Error("Only image uploads are supported."));
  },
});

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function isLocalDevelopmentOrigin(origin) {
  if (IS_PRODUCTION) {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    return isLoopback && (protocol === "http:" || protocol === "https:");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || isLocalDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

function createToken() {
  return jwt.sign({ email: ADMIN_EMAIL, role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeProduct(product) {
  const id = slugify(product.id || product.name) || randomUUID();

  return {
    id,
    name: String(product.name || "").trim(),
    price: Number(product.price || 0),
    category: String(product.category || "").trim(),
    sizes: Array.isArray(product.sizes)
      ? product.sizes.map((item) => String(item).trim()).filter(Boolean)
      : String(product.sizes || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    color: String(product.color || "").trim(),
    description: String(product.description || "").trim(),
    image: String(product.image || "").trim(),
    productType: ["garment", "fabric", "accessory"].includes(product.productType) ? product.productType : "garment",
    unit: String(product.unit || "piece").trim().toLowerCase(),
    available: Boolean(product.available),
  };
}

function validateProduct(product) {
  if (!product.name || !product.category || !product.color || !product.description || !product.image) {
    return "Name, category, color, description, and image are required.";
  }

  if (!Number.isFinite(product.price) || product.price <= 0) {
    return "Price must be greater than zero.";
  }

  if (product.productType === "garment" && !product.sizes.length) {
    return "At least one size is required.";
  }

  if (!product.unit) return "A sales unit is required.";

  if (!product.image.startsWith("/")) {
    try {
      new URL(product.image);
    } catch {
      return "Image must be a valid URL or a site asset path.";
    }
  }

  return "";
}

function normalizeCategory(category) {
  const name = String(category.name || "").trim();
  return {
    id: slugify(category.id || name) || randomUUID(),
    name,
  };
}

async function readProducts() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeProducts(products) {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

async function readCategories() {
  const raw = await fs.readFile(CATEGORIES_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeCategories(categories) {
  await fs.writeFile(CATEGORIES_FILE, `${JSON.stringify(categories, null, 2)}\n`, "utf8");
}

async function readLookbook() {
  const raw = await fs.readFile(LOOKBOOK_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeLookbook(lookbook) {
  await fs.writeFile(LOOKBOOK_FILE, `${JSON.stringify(lookbook, null, 2)}\n`, "utf8");
}

async function readSchool() {
  const raw = await fs.readFile(SCHOOL_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeSchool(school) {
  await fs.writeFile(SCHOOL_FILE, `${JSON.stringify(school, null, 2)}\n`, "utf8");
}

function normalizeSchool(value) {
  return {
    eyebrow: String(value.eyebrow || "").trim(),
    title: String(value.title || "").trim(),
    description: String(value.description || "").trim(),
    visualCaption: String(value.visualCaption || "").trim(),
    location: String(value.location || "Abuja, Nigeria").trim(),
    programs: Array.isArray(value.programs) ? [...new Set(value.programs.map((item) => String(item).trim()).filter(Boolean))] : [],
    published: Boolean(value.published),
  };
}

function validateSchool(school) {
  if (!school.eyebrow || !school.title || !school.description || !school.visualCaption || !school.location) return "School heading, copy, caption, and location are required.";
  if (!school.programs.length) return "Add at least one school programme.";
  return "";
}

function normalizeLookbook(value) {
  const chapters = Array.isArray(value.chapters) ? value.chapters : [];
  return {
    id: slugify(value.id || value.title) || "lookbook",
    eyebrow: String(value.eyebrow || "").trim(),
    title: String(value.title || "").trim(),
    manifestoTitle: String(value.manifestoTitle || "").trim(),
    manifestoCopy: String(value.manifestoCopy || "").trim(),
    heroProductId: String(value.heroProductId || "").trim(),
    published: Boolean(value.published),
    chapters: chapters.map((chapter, index) => ({
      id: slugify(chapter.id || chapter.title) || `chapter-${index + 1}`,
      number: String(chapter.number || index + 1).trim(),
      title: String(chapter.title || "").trim(),
      copy: String(chapter.copy || "").trim(),
      productId: String(chapter.productId || "").trim(),
    })),
    finaleEyebrow: String(value.finaleEyebrow || "").trim(),
    finaleTitle: String(value.finaleTitle || "").trim(),
    finaleProductIds: Array.isArray(value.finaleProductIds) ? [...new Set(value.finaleProductIds.map(String).filter(Boolean))] : [],
  };
}

function validateLookbook(lookbook, products) {
  if (!lookbook.title || !lookbook.manifestoTitle || !lookbook.manifestoCopy || !lookbook.heroProductId) {
    return "Title, manifesto, and hero product are required.";
  }
  if (!lookbook.chapters.length) return "Add at least one Lookbook chapter.";
  if (lookbook.chapters.some((chapter) => !chapter.title || !chapter.copy || !chapter.productId)) {
    return "Every chapter needs a title, copy, and product.";
  }
  const productIds = new Set(products.map((product) => product.id));
  const referencedIds = [lookbook.heroProductId, ...lookbook.chapters.map((chapter) => chapter.productId), ...lookbook.finaleProductIds];
  if (referencedIds.some((id) => !productIds.has(id))) return "One or more selected Lookbook products no longer exist.";
  return "";
}

function authRequired(request, response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    request.admin = verifyToken(token);
    next();
  } catch {
    response.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

function cloudinaryReady() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

function uploadBufferToCloudinary(file, folder = "moghene/products") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed."));
          return;
        }
        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
}

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/v1/catalog", async (_request, response, next) => {
  try {
    const [products, categoryRecords] = await Promise.all([readProducts(), readCategories()]);
    const visible = products.filter((product) => product.available);
    const categories = categoryRecords.map((category) => category.name);
    response.json({ products: visible, categories });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/lookbook", async (_request, response, next) => {
  try {
    const [lookbook, products] = await Promise.all([readLookbook(), readProducts()]);
    if (!lookbook.published) {
      response.json({ lookbook: null });
      return;
    }
    const visibleProducts = new Map(products.filter((product) => product.available).map((product) => [product.id, product]));
    response.json({
      lookbook: {
        ...lookbook,
        heroProduct: visibleProducts.get(lookbook.heroProductId) || null,
        chapters: lookbook.chapters.map((chapter) => ({ ...chapter, product: visibleProducts.get(chapter.productId) || null })).filter((chapter) => chapter.product),
        finaleProducts: lookbook.finaleProductIds.map((id) => visibleProducts.get(id)).filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/school", async (_request, response, next) => {
  try {
    const school = await readSchool();
    response.json({ school: school.published ? school : null });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/admin/login", (request, response) => {
  const { email, password } = request.body || {};

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    response.status(401).json({ message: "Those details do not match the store login." });
    return;
  }

  response.json({
    token: createToken(),
    admin: { email: ADMIN_EMAIL },
  });
});

app.post("/api/v1/admin/logout", (_request, response) => {
  response.json({ success: true });
});

app.get("/api/v1/admin/me", authRequired, (request, response) => {
  response.json({ admin: { email: request.admin.email } });
});

app.post("/api/v1/admin/uploads", authRequired, upload.single("image"), async (request, response, next) => {
  try {
    if (!cloudinaryReady()) {
      response.status(503).json({ message: "Cloudinary is not configured on the backend yet." });
      return;
    }

    if (!request.file) {
      response.status(400).json({ message: "Choose an image file to upload." });
      return;
    }

    const folder = cleanEnvValue(request.body?.folder) || "moghene/products";
    const result = await uploadBufferToCloudinary(request.file, folder);
    response.status(201).json({
      asset: {
        url: result.secure_url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/items", authRequired, async (_request, response, next) => {
  try {
    const items = await readProducts();
    response.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/categories", authRequired, async (_request, response, next) => {
  try {
    const [categories, products] = await Promise.all([readCategories(), readProducts()]);
    const items = categories.map((category) => ({
      ...category,
      itemCount: products.filter((product) => product.category === category.name).length,
    }));
    response.json({ categories: items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/lookbook", authRequired, async (_request, response, next) => {
  try {
    response.json({ lookbook: await readLookbook() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/admin/lookbook", authRequired, async (request, response, next) => {
  try {
    const products = await readProducts();
    const lookbook = normalizeLookbook(request.body || {});
    const validationError = validateLookbook(lookbook, products);
    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }
    await writeLookbook(lookbook);
    response.json({ lookbook });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/admin/school", authRequired, async (_request, response, next) => {
  try {
    response.json({ school: await readSchool() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/v1/admin/school", authRequired, async (request, response, next) => {
  try {
    const school = normalizeSchool(request.body || {});
    const validationError = validateSchool(school);
    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }
    await writeSchool(school);
    response.json({ school });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/admin/categories", authRequired, async (request, response, next) => {
  try {
    const categories = await readCategories();
    const category = normalizeCategory(request.body || {});

    if (!category.name) {
      response.status(400).json({ message: "Category name is required." });
      return;
    }

    if (categories.some((item) => item.name.toLowerCase() === category.name.toLowerCase())) {
      response.status(409).json({ message: "That category already exists." });
      return;
    }

    const nextCategories = [...categories, category];
    await writeCategories(nextCategories);
    response.status(201).json({ category: { ...category, itemCount: 0 } });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/v1/admin/categories/:id", authRequired, async (request, response, next) => {
  try {
    const [categories, products] = await Promise.all([readCategories(), readProducts()]);
    const index = categories.findIndex((category) => category.id === request.params.id);

    if (index === -1) {
      response.status(404).json({ message: "Category not found." });
      return;
    }

    const name = String(request.body?.name || "").trim();
    if (!name) {
      response.status(400).json({ message: "Category name is required." });
      return;
    }

    if (categories.some((category, categoryIndex) => categoryIndex !== index && category.name.toLowerCase() === name.toLowerCase())) {
      response.status(409).json({ message: "That category already exists." });
      return;
    }

    const previous = categories[index];
    const category = { ...previous, name };
    const nextCategories = categories.map((item, categoryIndex) => categoryIndex === index ? category : item);
    const nextProducts = products.map((product) => product.category === previous.name ? { ...product, category: name } : product);
    await Promise.all([writeCategories(nextCategories), writeProducts(nextProducts)]);
    response.json({
      category: { ...category, itemCount: nextProducts.filter((product) => product.category === name).length },
      items: nextProducts,
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/admin/categories/:id", authRequired, async (request, response, next) => {
  try {
    const [categories, products] = await Promise.all([readCategories(), readProducts()]);
    const category = categories.find((item) => item.id === request.params.id);

    if (!category) {
      response.status(404).json({ message: "Category not found." });
      return;
    }

    const itemCount = products.filter((product) => product.category === category.name).length;
    if (itemCount > 0) {
      response.status(409).json({ message: `Move or delete the ${itemCount} item${itemCount === 1 ? "" : "s"} in this category first.` });
      return;
    }

    await writeCategories(categories.filter((item) => item.id !== category.id));
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/admin/items", authRequired, async (request, response, next) => {
  try {
    const [items, categories] = await Promise.all([readProducts(), readCategories()]);
    const product = normalizeProduct(request.body);
    const validationError = validateProduct(product);

    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }

    if (!categories.some((category) => category.name === product.category)) {
      response.status(400).json({ message: "Select a category managed in the Categories workspace." });
      return;
    }

    if (items.some((item) => item.id === product.id)) {
      response.status(409).json({ message: "An inventory item with this ID already exists." });
      return;
    }

    const nextItems = [product, ...items];
    await writeProducts(nextItems);
    response.status(201).json({ item: product });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/v1/admin/items/:id", authRequired, async (request, response, next) => {
  try {
    const [items, categories] = await Promise.all([readProducts(), readCategories()]);
    const index = items.findIndex((item) => item.id === request.params.id);

    if (index === -1) {
      response.status(404).json({ message: "Item not found." });
      return;
    }

    const merged = normalizeProduct({ ...items[index], ...request.body, id: request.params.id });
    const validationError = validateProduct(merged);

    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }

    if (!categories.some((category) => category.name === merged.category)) {
      response.status(400).json({ message: "Select a category managed in the Categories workspace." });
      return;
    }

    const nextItems = items.map((item) => (item.id === request.params.id ? merged : item));
    await writeProducts(nextItems);
    response.json({ item: merged });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/v1/admin/items/:id", authRequired, async (request, response, next) => {
  try {
    const [items, lookbook] = await Promise.all([readProducts(), readLookbook()]);
    const isReferenced = lookbook.heroProductId === request.params.id || lookbook.chapters.some((chapter) => chapter.productId === request.params.id) || lookbook.finaleProductIds.includes(request.params.id);

    if (isReferenced) {
      response.status(409).json({ message: "Remove this item from the Lookbook before deleting it." });
      return;
    }
    const nextItems = items.filter((item) => item.id !== request.params.id);

    if (nextItems.length === items.length) {
      response.status(404).json({ message: "Item not found." });
      return;
    }

    await writeProducts(nextItems);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const isUploadError = error instanceof multer.MulterError || message === "Only image uploads are supported.";
  response.status(isUploadError ? 400 : 500).json({ message });
});

app.listen(PORT, HOST, () => {
  console.log(`Moghene API listening on http://${HOST}:${PORT}`);
});
