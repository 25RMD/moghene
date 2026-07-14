import React, { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Edit3,
  Eye,
  EyeOff,
  LogOut,
  Menu,
  Package,
  Plus,
  GraduationCap,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import {
  clearToken,
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getCurrentAdmin,
  getLookbook,
  getSchool,
  getToken,
  listCategories,
  listItems,
  login,
  logout,
  updateCategory,
  updateItem,
  updateLookbook,
  updateSchool,
  uploadImage,
} from "./api.js";
import { currency } from "./format.js";

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173";
const LOGIN_IMAGE = 'image-set(url("/admin-login-visual.avif") type("image/avif"), url("/admin-login-visual.webp") type("image/webp"))';
const IMAGE_VARIANTS = {
  thumb: { width: 156, height: 188, transform: "f_auto,q_auto:eco,c_fill,g_auto,w_156,h_188" },
  thumb2x: { width: 312, height: 376, transform: "f_auto,q_auto:eco,c_fill,g_auto,w_312,h_376" },
  preview: { width: 1120, height: 420, transform: "f_auto,q_auto,c_fill,g_auto,w_1120,h_420" },
  preview2x: { width: 1680, height: 630, transform: "f_auto,q_auto,c_fill,g_auto,w_1680,h_630" },
};
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "One size"];
const emptyProduct = {
  id: "",
  name: "",
  price: "",
  category: "",
  sizes: ["S", "M", "L"],
  color: "",
  description: "",
  image: "",
  productType: "garment",
  unit: "piece",
  available: true,
};

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } },
};

function cloudinaryVariant(url, variant) {
  if (!url || !url.includes("/upload/")) return url;
  const [base, query = ""] = url.split("?");
  const nextUrl = base.replace("/upload/", `/upload/${variant.transform}/`);
  return query ? `${nextUrl}?${query}` : nextUrl;
}

function ProductImage({ src, alt, variant = "thumb", className = "" }) {
  const primary = IMAGE_VARIANTS[variant];
  const density2x = IMAGE_VARIANTS[`${variant}2x`];
  const optimizedSrc = cloudinaryVariant(src, primary);
  const optimizedSrc2x = density2x ? cloudinaryVariant(src, density2x) : "";
  const isCloudinary = optimizedSrc2x && optimizedSrc2x !== optimizedSrc;

  return (
    <img
      className={className}
      src={optimizedSrc}
      srcSet={isCloudinary ? `${optimizedSrc} 1x, ${optimizedSrc2x} 2x` : undefined}
      alt={alt}
      width={primary.width}
      height={primary.height}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

export function App() {
  const [authStatus, setAuthStatus] = useState("checking");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lookbook, setLookbook] = useState(null);
  const [school, setSchool] = useState(null);
  const [dataStatus, setDataStatus] = useState("idle");
  const [dataError, setDataError] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setAuthStatus("signed-out");
      return undefined;
    }
    getCurrentAdmin()
      .then(() => { if (active) setAuthStatus("signed-in"); })
      .catch(() => { clearToken(); if (active) setAuthStatus("signed-out"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authStatus !== "signed-in") return undefined;
    let active = true;
    setDataStatus("loading");
    setDataError("");
    Promise.all([listItems(), listCategories(), getLookbook(), getSchool()])
      .then(([itemsPayload, categoriesPayload, lookbookPayload, schoolPayload]) => {
        if (!active) return;
        setProducts(Array.isArray(itemsPayload.items) ? itemsPayload.items : []);
        setCategories(Array.isArray(categoriesPayload.categories) ? categoriesPayload.categories : []);
        setLookbook(lookbookPayload.lookbook || null);
        setSchool(schoolPayload.school || null);
        setDataStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof Error && "status" in error && error.status === 401) {
          clearToken();
          setAuthStatus("signed-out");
        }
        setDataError(error instanceof Error ? error.message : "Unable to load the admin workspace.");
        setDataStatus("error");
      });
    return () => { active = false; };
  }, [authStatus]);

  async function submitLogin(event) {
    event.preventDefault();
    try {
      setLoginPending(true);
      setLoginError("");
      await login(loginForm.email, loginForm.password);
      setAuthStatus("signed-in");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoginPending(false);
    }
  }

  function handleLogout() {
    logout();
    setProducts([]);
    setCategories([]);
    setDataStatus("idle");
    setAuthStatus("signed-out");
  }

  if (authStatus === "checking") return <LoadingScreen />;
  if (authStatus !== "signed-in") {
    return <LoginScreen form={loginForm} setForm={setLoginForm} error={loginError} pending={loginPending} onSubmit={submitLogin} />;
  }

  return (
    <AdminDashboard
      products={products}
      categories={categories}
      lookbook={lookbook}
      school={school}
      dataStatus={dataStatus}
      dataError={dataError}
      setProducts={setProducts}
      setCategories={setCategories}
      setLookbook={setLookbook}
      setSchool={setSchool}
      onLogout={handleLogout}
    />
  );
}

function LoadingScreen() {
  return <div className="loading-screen"><img className="admin-wordmark" src="/logo.png" alt="M-Oghene" /><span>Opening private inventory</span><i /></div>;
}

function LoginScreen({ form, setForm, error, pending, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="login-layout">
      <section className="login-visual" style={{ "--login-image": LOGIN_IMAGE }}>
        <div className="login-visual-copy"><img className="admin-wordmark" src="/logo.png" alt="M-Oghene" /><span>Private inventory</span></div>
      </section>
      <motion.section className="login-form-panel" variants={reveal} initial="hidden" animate="visible">
        <div className="login-form-inner">
          <span className="admin-eyebrow">Secure studio access</span>
          <h1>Inventory login</h1>
          <p>Sign in to manage the storefront inventory.</p>
          <form onSubmit={onSubmit}>
            <label><span>Email</span><input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label><span>Password</span><div className="password-field"><input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error ? <p className="admin-error" role="alert">{error}</p> : null}
            <button className="primary-button" disabled={pending}>{pending ? "Signing in…" : "Sign in"}<ArrowRight size={17} /></button>
          </form>
          <a className="back-link" href={STOREFRONT_URL}><ArrowLeft size={15} /> Back to shop</a>
        </div>
      </motion.section>
    </main>
  );
}

function AdminDashboard({ products, categories, lookbook, school, dataStatus, dataError, setProducts, setCategories, setLookbook, setSchool, onLogout }) {
  const [section, setSection] = useState("items");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");

  function selectSection(nextSection) {
    startTransition(() => setSection(nextSection));
    setSidebarOpen(false);
    setNotice("");
  }

  function openNewItem() {
    setEditingId(null);
    setDraft({ ...emptyProduct, category: categories[0]?.name || "" });
    setNotice("");
    setEditorOpen(true);
  }

  function openEditItem(product) {
    setEditingId(product.id);
    setDraft({ ...product, sizes: Array.isArray(product.sizes) ? product.sizes : [] });
    setNotice("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setDraft(emptyProduct);
    setNotice("");
  }

  async function saveItem(event) {
    event.preventDefault();
    const slug = draft.id || draft.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const nextProduct = {
      ...draft,
      id: slug || crypto.randomUUID(),
      price: Number(draft.price),
      sizes: draft.productType === "garment" ? (Array.isArray(draft.sizes) ? draft.sizes : String(draft.sizes).split(",").map((item) => item.trim()).filter(Boolean)) : [],
      available: Boolean(draft.available),
    };

    try {
      setSubmitting(true);
      setNotice("");
      if (editingId) {
        const previousItem = products.find((item) => item.id === editingId);
        const payload = await updateItem(editingId, nextProduct);
        setProducts((items) => items.map((item) => item.id === editingId ? payload.item : item));
        if (previousItem && previousItem.category !== payload.item.category) {
          setCategories((items) => items.map((category) => {
            if (category.name === previousItem.category) return { ...category, itemCount: Math.max(0, category.itemCount - 1) };
            if (category.name === payload.item.category) return { ...category, itemCount: category.itemCount + 1 };
            return category;
          }));
        }
      } else {
        const payload = await createItem(nextProduct);
        setProducts((items) => [payload.item, ...items]);
        setCategories((items) => items.map((category) => category.name === payload.item.category ? { ...category, itemCount: category.itemCount + 1 } : category));
      }
      closeEditor();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save this item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      setBusyId(product.id);
      await deleteItem(product.id);
      setProducts((items) => items.filter((item) => item.id !== product.id));
      setCategories((items) => items.map((category) => category.name === product.category ? { ...category, itemCount: Math.max(0, category.itemCount - 1) } : category));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete this item.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleItem(product) {
    try {
      setBusyId(product.id);
      const payload = await updateItem(product.id, { ...product, available: !product.available });
      setProducts((items) => items.map((item) => item.id === product.id ? payload.item : item));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update storefront visibility.");
    } finally {
      setBusyId("");
    }
  }

  const liveCount = products.filter((item) => item.available).length;

  return (
    <main className="admin-dashboard">
      <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} data-open={sidebarOpen} />
      <aside className="admin-sidebar" data-open={sidebarOpen}>
        <div className="sidebar-brand"><img className="admin-wordmark" src="/logo.png" alt="M-Oghene" /><span>Private inventory</span></div>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          <button className={section === "items" ? "active" : ""} onClick={() => selectSection("items")}><Package size={18} /><span>Items</span><strong>{products.length}</strong></button>
          <button className={section === "categories" ? "active" : ""} onClick={() => selectSection("categories")}><Tags size={18} /><span>Categories</span><strong>{categories.length}</strong></button>
          <button className={section === "lookbook" ? "active" : ""} onClick={() => selectSection("lookbook")}><BookOpen size={18} /><span>Lookbook</span><strong>{lookbook?.chapters?.length || 0}</strong></button>
          <button className={section === "school" ? "active" : ""} onClick={() => selectSection("school")}><GraduationCap size={18} /><span>School</span><strong>{school?.programs?.length || 0}</strong></button>
        </nav>
        <div className="sidebar-meta"><span>Storefront management</span><button onClick={onLogout}>Sign out <LogOut size={15} /></button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button className="sidebar-trigger" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div><span>Workspace</span><strong>{section === "items" ? "Items" : section === "categories" ? "Categories" : section === "lookbook" ? "Lookbook" : "School"}</strong></div>
          <div className="topbar-summary"><span>{liveCount} visible</span><span>{products.length - liveCount} hidden</span></div>
        </header>

        {dataStatus === "loading" ? <WorkspaceLoading /> : null}
        {dataStatus === "error" ? <div className="workspace-error"><h1>Unable to load workspace</h1><p>{dataError}</p></div> : null}
        {dataStatus === "ready" && section === "items" ? (
          <ItemsWorkspace products={products} categories={categories} busyId={busyId} notice={notice} onAdd={openNewItem} onEdit={openEditItem} onToggle={toggleItem} onDelete={removeItem} />
        ) : null}
        {dataStatus === "ready" && section === "categories" ? (
          <CategoriesWorkspace categories={categories} setCategories={setCategories} setProducts={setProducts} />
        ) : null}
        {dataStatus === "ready" && section === "lookbook" && lookbook ? <LookbookWorkspace lookbook={lookbook} setLookbook={setLookbook} products={products} /> : null}
        {dataStatus === "ready" && section === "school" && school ? <SchoolWorkspace school={school} setSchool={setSchool} /> : null}
      </section>

      <AnimatePresence>
        {editorOpen ? (
          <ProductEditor
            draft={draft}
            setDraft={setDraft}
            categories={categories}
            editingId={editingId}
            submitting={submitting}
            notice={notice}
            onSubmit={saveItem}
            onClose={closeEditor}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function WorkspaceLoading() {
  return <div className="workspace-loading"><i /><span>Loading workspace</span></div>;
}

function ItemsWorkspace({ products, categories, busyId, notice, onAdd, onEdit, onToggle, onDelete }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const visibleProducts = products.filter((item) => {
    const matchesCategory = category === "All" || item.category === category;
    const matchesQuery = `${item.name} ${item.category} ${item.color}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <motion.div className="workspace-page" variants={reveal} initial="hidden" animate="visible">
      <header className="workspace-heading"><div><span className="admin-eyebrow">Storefront catalog</span><h1>Items</h1><p>Manage product details, pricing, availability and imagery.</p></div><button className="workspace-primary" onClick={onAdd}><Plus size={17} /> Add item</button></header>
      <div className="workspace-toolbar">
        <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items" /></label>
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select>
        <span>{visibleProducts.length} results</span>
      </div>
      {notice ? <p className="workspace-notice admin-error">{notice}</p> : null}
      <div className="items-table">
        <div className="items-table-head"><span>Item</span><span>Category</span><span>Size / unit</span><span>Status</span><span>Actions</span></div>
        <AnimatePresence initial={false}>
          {visibleProducts.map((product) => <ItemRow product={product} busy={busyId === product.id} onEdit={() => onEdit(product)} onToggle={() => onToggle(product)} onDelete={() => onDelete(product)} key={product.id} />)}
        </AnimatePresence>
        {!visibleProducts.length ? <div className="empty-workspace"><Package size={24} /><h2>No items found</h2><p>Try another search or category.</p></div> : null}
      </div>
    </motion.div>
  );
}

function ItemRow({ product, busy, onEdit, onToggle, onDelete }) {
  return (
    <motion.article className="item-row" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 18 }}>
      <div className="item-identity"><ProductImage src={product.image} alt={product.name} /><div><h3>{product.name}</h3><strong>{currency(product.price)}</strong><small>{product.color}</small></div></div>
      <span className="item-category">{product.category}</span>
      <span className="item-sizes">{product.productType === "garment" ? product.sizes.join(", ") : `Per ${product.unit}`}</span>
      <span className={`item-status ${product.available ? "visible" : "hidden"}`}><i /> {product.available ? "Visible" : "Hidden"}</span>
      <div className="item-actions"><button className="edit-action" disabled={busy} onClick={onEdit}><Edit3 size={15} /> Edit</button><button className={`visibility-switch ${product.available ? "active" : ""}`} disabled={busy} onClick={onToggle} aria-label={product.available ? `Hide ${product.name}` : `Show ${product.name}`}><span /></button><button className="delete-action" disabled={busy} onClick={onDelete} aria-label={`Delete ${product.name}`}><Trash2 size={16} /></button></div>
    </motion.article>
  );
}

function ProductEditor({ draft, setDraft, categories, editingId, submitting, notice, onSubmit, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadError("");
      const payload = await uploadImage(file);
      const url = payload.asset?.secureUrl || payload.asset?.url;
      if (!url) throw new Error("Cloudinary did not return an image URL.");
      setDraft((current) => ({ ...current, image: url }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to upload this image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function toggleSize(size) {
    setDraft((current) => {
      const sizes = Array.isArray(current.sizes) ? current.sizes : [];
      return {
        ...current,
        sizes: sizes.includes(size) ? sizes.filter((item) => item !== size) : [...sizes, size],
      };
    });
  }

  return (
    <motion.aside className="editor-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button className="editor-scrim" onClick={onClose} aria-label="Close editor" />
      <motion.form className="product-editor" onSubmit={onSubmit} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
        <header><div><span className="admin-eyebrow">Catalog editor</span><h2>{editingId ? "Edit item" : "Add item"}</h2></div><button type="button" onClick={onClose} aria-label="Close editor"><X /></button></header>
        <div className="editor-fields">
          {draft.image ? <div className="editor-preview"><ProductImage src={draft.image} alt="Item preview" variant="preview" /><span>Image preview</span></div> : null}
          <label><span>Name</span><input required placeholder="e.g. Adire Kaftan" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <div className="editor-pair"><label><span>Price</span><input required type="number" min="1" placeholder="85000" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></label><label><span>Category</span><select required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="" disabled>Select category</option>{categories.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label></div>
          <div className="editor-pair"><label><span>Item type</span><select value={draft.productType} onChange={(event) => { const productType = event.target.value; setDraft({ ...draft, productType, unit: productType === "fabric" ? "yard" : "piece", sizes: productType === "garment" ? Array.isArray(draft.sizes) && draft.sizes.length ? draft.sizes : ["S", "M", "L"] : [] }); }}><option value="garment">Garment</option><option value="fabric">Fabric</option><option value="accessory">Accessory</option></select></label><label><span>Sales unit</span><select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}><option value="piece">Piece</option><option value="yard">Yard</option><option value="set">Set</option><option value="pair">Pair</option></select></label></div>
          <div className="editor-pair">{draft.productType === "garment" ? <SizePicker selectedSizes={Array.isArray(draft.sizes) ? draft.sizes : []} onToggle={toggleSize} /> : <label><span>Order quantity</span><input disabled value={`Sold per ${draft.unit}`} /></label>}<label><span>Color</span><input required placeholder="Indigo" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label></div>
          <div className="image-upload-field">
            <label><span>Image URL or site asset</span><input required type="text" placeholder="https://… or /image.png" value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} /></label>
            <label className="upload-dropzone">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              <span>{uploading ? "Uploading to Cloudinary…" : "Upload image to Cloudinary"}</span>
              <small>JPG, PNG or WebP up to 8MB. Images are compressed to WebP before Cloudinary stores them.</small>
            </label>
            {uploadError ? <p className="admin-error">{uploadError}</p> : null}
          </div>
          <label><span>Description</span><textarea required placeholder="Describe the cut, textile and finish." value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="editor-visibility"><input type="checkbox" checked={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.checked })} /><span><i>{draft.available ? <Check size={13} /> : null}</i> Visible in storefront</span></label>
          {notice ? <p className="admin-error">{notice}</p> : null}
        </div>
        <footer><button type="button" className="editor-cancel" onClick={onClose}>Cancel</button><button className="editor-save" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save changes" : "Add item"}<Check size={16} /></button></footer>
      </motion.form>
    </motion.aside>
  );
}

function SizePicker({ selectedSizes, onToggle }) {
  return (
    <div className="size-picker">
      <span>Sizes</span>
      <details>
        <summary>{selectedSizes.length ? selectedSizes.join(", ") : "Select sizes"}</summary>
        <div className="size-options">
          {SIZE_OPTIONS.map((size) => (
            <label key={size}>
              <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => onToggle(size)} />
              <span>{size}</span>
            </label>
          ))}
        </div>
      </details>
      <input className="size-required-input" required value={selectedSizes.join(",")} onChange={() => {}} tabIndex={-1} aria-hidden="true" />
    </div>
  );
}

function LookbookWorkspace({ lookbook, setLookbook, products }) {
  const [draft, setDraft] = useState(() => structuredClone(lookbook));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(structuredClone(lookbook)), [lookbook]);

  function updateChapter(index, patch) {
    setDraft((current) => ({ ...current, chapters: current.chapters.map((chapter, chapterIndex) => chapterIndex === index ? { ...chapter, ...patch } : chapter) }));
  }

  async function save(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      const payload = await updateLookbook(draft);
      setLookbook(payload.lookbook);
      setMessage("Lookbook saved and storefront updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the Lookbook.");
    } finally {
      setSaving(false);
    }
  }

  function toggleFinale(id) {
    setDraft((current) => ({ ...current, finaleProductIds: current.finaleProductIds.includes(id) ? current.finaleProductIds.filter((item) => item !== id) : [...current.finaleProductIds, id] }));
  }

  return (
    <motion.form className="workspace-page content-form" onSubmit={save} variants={reveal} initial="hidden" animate="visible">
      <header className="workspace-heading"><div><span className="admin-eyebrow">Editorial control</span><h1>Lookbook</h1><p>Choose the products and story customers see across every Lookbook chapter.</p></div><button className="workspace-primary" disabled={saving}><Check size={17} /> {saving ? "Saving…" : "Save Lookbook"}</button></header>
      {message ? <p className="content-message">{message}</p> : null}
      <section className="content-panel content-grid">
        <label><span>Eyebrow</span><input required value={draft.eyebrow} onChange={(event) => setDraft({ ...draft, eyebrow: event.target.value })} /></label>
        <label><span>Title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label className="wide"><span>Manifesto headline</span><textarea required value={draft.manifestoTitle} onChange={(event) => setDraft({ ...draft, manifestoTitle: event.target.value })} /></label>
        <label className="wide"><span>Manifesto copy</span><textarea required value={draft.manifestoCopy} onChange={(event) => setDraft({ ...draft, manifestoCopy: event.target.value })} /></label>
        <label><span>Hero product</span><select required value={draft.heroProductId} onChange={(event) => setDraft({ ...draft, heroProductId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="content-toggle"><span>Published</span><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /></label>
      </section>
      <div className="content-section-heading"><div><span className="admin-eyebrow">Story sequence</span><h2>Chapters</h2></div><button type="button" onClick={() => setDraft({ ...draft, chapters: [...draft.chapters, { id: crypto.randomUUID(), number: String(draft.chapters.length + 1), title: "New chapter", copy: "Chapter story.", productId: products[0]?.id || "" }] })}><Plus size={16} /> Add chapter</button></div>
      <div className="chapter-list">{draft.chapters.map((chapter, index) => <article className="chapter-editor" key={chapter.id}><header><strong>{String(index + 1).padStart(2, "0")}</strong><button type="button" disabled={draft.chapters.length === 1} onClick={() => setDraft({ ...draft, chapters: draft.chapters.filter((_, chapterIndex) => chapterIndex !== index) })}><Trash2 size={15} /></button></header><div><label><span>Numeral</span><input value={chapter.number} onChange={(event) => updateChapter(index, { number: event.target.value })} /></label><label><span>Title</span><input required value={chapter.title} onChange={(event) => updateChapter(index, { title: event.target.value })} /></label><label className="wide"><span>Copy</span><textarea required value={chapter.copy} onChange={(event) => updateChapter(index, { copy: event.target.value })} /></label><label className="wide"><span>Product</span><select value={chapter.productId} onChange={(event) => updateChapter(index, { productId: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label></div></article>)}</div>
      <section className="content-panel content-grid finale-control"><label><span>Finale eyebrow</span><input value={draft.finaleEyebrow} onChange={(event) => setDraft({ ...draft, finaleEyebrow: event.target.value })} /></label><label><span>Finale title</span><input value={draft.finaleTitle} onChange={(event) => setDraft({ ...draft, finaleTitle: event.target.value })} /></label><div className="wide"><span>Finale products</span><div className="selection-grid">{products.map((product) => <label key={product.id}><input type="checkbox" checked={draft.finaleProductIds.includes(product.id)} onChange={() => toggleFinale(product.id)} /><span>{product.name}</span></label>)}</div></div></section>
    </motion.form>
  );
}

function SchoolWorkspace({ school, setSchool }) {
  const [draft, setDraft] = useState(() => structuredClone(school));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(structuredClone(school)), [school]);

  async function save(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      const payload = await updateSchool(draft);
      setSchool(payload.school);
      setMessage("School details saved and storefront updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save school details.");
    } finally {
      setSaving(false);
    }
  }

  return <motion.form className="workspace-page content-form" onSubmit={save} variants={reveal} initial="hidden" animate="visible"><header className="workspace-heading"><div><span className="admin-eyebrow">Admissions content</span><h1>School</h1><p>Control the programmes and copy used by the WhatsApp registration section.</p></div><button className="workspace-primary" disabled={saving}><Check size={17} /> {saving ? "Saving…" : "Save School"}</button></header>{message ? <p className="content-message">{message}</p> : null}<section className="content-panel content-grid"><label><span>Eyebrow</span><input required value={draft.eyebrow} onChange={(event) => setDraft({ ...draft, eyebrow: event.target.value })} /></label><label><span>Title</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label className="wide"><span>Description</span><textarea required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label><span>Image caption</span><input required value={draft.visualCaption} onChange={(event) => setDraft({ ...draft, visualCaption: event.target.value })} /></label><label><span>Location</span><input required value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><label className="wide"><span>Programmes — one per line</span><textarea required rows="7" value={draft.programs.join("\n")} onChange={(event) => setDraft({ ...draft, programs: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label><label className="content-toggle"><span>Published</span><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /></label></section></motion.form>;
}

function CategoriesWorkspace({ categories, setCategories, setProducts }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function addCategory(event) {
    event.preventDefault();
    try {
      setBusyId("new");
      setMessage("");
      const payload = await createCategory({ name });
      setCategories((items) => [...items, payload.category]);
      setName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add category.");
    } finally {
      setBusyId("");
    }
  }

  function beginEdit(category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setMessage("");
  }

  async function saveCategory(category) {
    try {
      setBusyId(category.id);
      setMessage("");
      const payload = await updateCategory(category.id, { name: editingName });
      setCategories((items) => items.map((item) => item.id === category.id ? payload.category : item));
      if (Array.isArray(payload.items)) setProducts(payload.items);
      setEditingId("");
      setEditingName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to rename category.");
    } finally {
      setBusyId("");
    }
  }

  async function removeCategory(category) {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try {
      setBusyId(category.id);
      setMessage("");
      await deleteCategory(category.id);
      setCategories((items) => items.filter((item) => item.id !== category.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete category.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <motion.div className="workspace-page" variants={reveal} initial="hidden" animate="visible">
      <header className="workspace-heading"><div><span className="admin-eyebrow">Catalog structure</span><h1>Categories</h1><p>Create and rename the groups customers use to browse the storefront.</p></div></header>
      <form className="category-create" onSubmit={addCategory}><label><span>New category</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" /></label><button disabled={busyId === "new" || !name.trim()}><Plus size={17} /> Add category</button></form>
      {message ? <p className="workspace-notice admin-error">{message}</p> : null}
      <div className="category-list">
        <div className="category-list-head"><span>Category</span><span>Items</span><span>Actions</span></div>
        {categories.map((category) => (
          <article className="category-row" key={category.id}>
            {editingId === category.id ? <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} /> : <div><span className="category-mark">{category.name.slice(0, 1)}</span><strong>{category.name}</strong></div>}
            <span>{category.itemCount} {category.itemCount === 1 ? "item" : "items"}</span>
            <div>
              {editingId === category.id ? <><button className="save-category" disabled={busyId === category.id || !editingName.trim()} onClick={() => saveCategory(category)}><Check size={15} /> Save</button><button className="icon-action" onClick={() => setEditingId("")} aria-label="Cancel edit"><X size={16} /></button></> : <button className="edit-action" onClick={() => beginEdit(category)}><Edit3 size={15} /> Edit</button>}
              <button className="delete-action" disabled={busyId === category.id} onClick={() => removeCategory(category)} aria-label={`Delete ${category.name}`}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </div>
    </motion.div>
  );
}
