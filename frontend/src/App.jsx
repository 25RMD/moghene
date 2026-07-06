import React, { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Instagram,
  Menu,
  MessageCircleMore,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { fetchCatalog, fetchLookbook, fetchSchool } from "./api.js";
import { currency } from "./format.js";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "2348012345678";
const STORE_EMAIL = import.meta.env.VITE_STORE_EMAIL || "hello@moghene.com";
const HERO_ASSET = `${import.meta.env.BASE_URL}hero-moghene.webp`;
const DEFAULT_SCHOOL = {
  eyebrow: "Moghene tailoring school / Abuja",
  title: "From first cut to final form.",
  description: "Small-cohort, practical training in pattern drafting, garment construction and professional finishing—guided by working makers.",
  visualCaption: "Learn the craft. Build your own language.",
  location: "Abuja, Nigeria",
  programs: ["Complete Tailoring Foundations", "Pattern Drafting Intensive", "Professional Finishing"],
};

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

function getPage() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/shop") return "shop";
  if (path === "/lookbook") return "lookbook";
  return "home";
}

function getSavedCart() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("moghene-cart") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function App() {
  const lenisRef = useRef(null);
  const [page, setPage] = useState(getPage);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lookbook, setLookbook] = useState(null);
  const [school, setSchool] = useState(DEFAULT_SCHOOL);
  const [cart, setCart] = useState(getSavedCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    const onPopState = () => setPage(getPage());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([fetchLookbook(), fetchSchool()]).then(([lookbookResult, schoolResult]) => {
      if (!active) return;
      if (lookbookResult.status === "fulfilled") setLookbook(lookbookResult.value.lookbook || null);
      if (schoolResult.status === "fulfilled" && schoolResult.value.school) setSchool(schoolResult.value.school);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetchCatalog()
      .then((payload) => {
        if (active) {
          setProducts(Array.isArray(payload.products) ? payload.products : []);
          setCategories(Array.isArray(payload.categories) ? payload.categories : []);
        }
      })
      .catch((error) => {
        if (active) setCatalogError(error instanceof Error ? error.message : "Unable to load the catalog.");
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("moghene-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    document.body.classList.toggle("is-locked", cartOpen || searchOpen);
    return () => document.body.classList.remove("is-locked");
  }, [cartOpen, searchOpen]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      anchors: true,
      stopInertiaOnNavigate: true,
      prevent: (node) => Boolean(node.closest?.(".cart-panel, .search-overlay, .mobile-menu")),
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (cartOpen || searchOpen) lenis.stop();
    else lenis.start();
  }, [cartOpen, searchOpen]);

  function navigate(nextPage, category = "") {
    const path = nextPage === "home" ? "/" : `/${nextPage}`;
    const url = category ? `${path}?category=${encodeURIComponent(category)}` : path;
    window.history.pushState({}, "", url);
    startTransition(() => setPage(nextPage));
    if (lenisRef.current) lenisRef.current.scrollTo(0, { duration: 0.9 });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }

  function addToCart(product, selection = product.sizes?.[0] || product.unit || "piece") {
    setCart((items) => {
      const match = items.find((item) => item.productId === product.id && item.size === selection);
      if (match) {
        return items.map((item) =>
          item.productId === product.id && item.size === selection ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...items,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          size: selection,
          productType: product.productType || "garment",
          unit: product.unit || "piece",
          quantity: 1,
        },
      ];
    });
    setCartOpen(true);
  }

  function changeQuantity(productId, size, delta) {
    setCart((items) =>
      items
        .map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId, size) {
    setCart((items) => items.filter((item) => item.productId !== productId || item.size !== size));
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shared = { products, categories, lookbook, school, loading: catalogLoading, error: catalogError, addToCart, navigate };

  return (
    <main className="site-shell">
      <Header
        page={page}
        cartCount={cartCount}
        navigate={navigate}
        onCart={() => setCartOpen(true)}
        onSearch={() => setSearchOpen(true)}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {page === "home" ? <HomePage {...shared} /> : null}
          {page === "shop" ? <ShopPage {...shared} /> : null}
          {page === "lookbook" ? <LookbookPage {...shared} /> : null}
        </motion.div>
      </AnimatePresence>
      <SiteFooter navigate={navigate} categories={categories} />
      <CartDrawer
        cart={cart}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        changeQuantity={changeQuantity}
        removeItem={removeItem}
        clearCart={() => setCart([])}
      />
      <SearchOverlay
        open={searchOpen}
        products={products}
        onClose={() => setSearchOpen(false)}
        addToCart={addToCart}
      />
    </main>
  );
}

function Header({ page, cartCount, navigate, onCart, onSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = page === "home" || page === "lookbook";

  function go(next) {
    setMenuOpen(false);
    navigate(next);
  }

  return (
    <>
      <header className={`site-header site-header-${page} ${dark ? "site-header-on-dark" : ""}`}>
        <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={21} />
        </button>
        <button className="wordmark" type="button" onClick={() => go("home")}>
          Moghene
        </button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <button className={page === "shop" ? "active" : ""} onClick={() => go("shop")} type="button">
            Shop
          </button>
          <button className={page === "lookbook" ? "active" : ""} onClick={() => go("lookbook")} type="button">
            Lookbook
          </button>
        </nav>
        <div className="header-actions">
          <button type="button" onClick={onSearch}>
            <span>Search</span>
            <Search size={16} />
          </button>
          <button type="button" onClick={onCart} aria-label={`Open bag with ${cartCount} items`}>
            <ShoppingBag size={16} />
            <span>Bag ({String(cartCount).padStart(2, "0")})</span>
          </button>
        </div>
      </header>
      <AnimatePresence>
        {menuOpen ? (
          <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="menu-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X />
            </button>
            <p className="wordmark">Moghene</p>
            <nav>
              <button onClick={() => go("home")}>Home</button>
              <button onClick={() => go("shop")}>Shop</button>
              <button onClick={() => go("lookbook")}>Lookbook</button>
            </nav>
            <div className="menu-meta">
              <span>Abuja, Nigeria</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function HomePage({ products, categories, school, loading, error, addToCart, navigate }) {
  return (
    <>
      <section className="home-hero" style={{ "--hero-image": `url("${HERO_ASSET}")` }}>
        <div className="hero-shade" />
        <motion.div className="hero-content" variants={reveal} initial="hidden" animate="visible">
          <h1>Made for<br />the entrance.</h1>
          <p className="hero-summary">Timeless silhouettes in heritage textiles, premade for presence.</p>
          <button className="button button-paper" type="button" onClick={() => navigate("shop")}>
            Shop arrivals <ArrowRight size={16} />
          </button>
        </motion.div>
        <div className="scroll-cue"><span>Scroll</span><ArrowDown size={16} /></div>
      </section>

      <CollectionRail navigate={navigate} categories={categories} />

      <section className="latest-section section-pad">
        <header className="home-latest-heading">
          <h2>Shop the latest</h2>
          <button className="text-link" type="button" onClick={() => navigate("shop")}>View all</button>
        </header>
        <ProductGrid products={products.filter((product) => product.productType === "garment").slice(0, 4)} loading={loading} error={error} addToCart={addToCart} compact />
        <button className="text-link section-link" type="button" onClick={() => navigate("shop")}>View all pieces <ArrowRight size={16} /></button>
      </section>

      <ServiceStrip />

      <FabricAccessoriesSection products={products} addToCart={addToCart} navigate={navigate} />

      <section className="lookbook-teaser section-pad">
        <div className="lookbook-collage" aria-hidden="true">
          {products.slice(0, 3).map((product, index) => (
            <motion.img
              key={product.id}
              src={product.image}
              alt=""
              className={`collage-image collage-${index + 1}`}
              whileHover={{ y: -12, rotate: 0 }}
            />
          ))}
        </div>
        <div className="teaser-copy">
          <span className="eyebrow">Lookbook 01 / 2026</span>
          <h2>The entrance season.</h2>
          <p>A study of presence, heritage and modern Nigerian form.</p>
          <button className="button button-ink" type="button" onClick={() => navigate("lookbook")}>Explore the lookbook <ArrowRight size={16} /></button>
        </div>
      </section>

      <TailoringSchoolSection school={school} />
    </>
  );
}

function CollectionRail({ navigate, categories }) {
  const marqueeItems = categories;

  if (!marqueeItems.length) return null;

  return (
    <section className="collection-rail" aria-label="Shop by collection">
      <div className="collection-marquee-track">
        {[false, true].map((duplicate) => (
          <div className="collection-marquee-group" aria-hidden={duplicate || undefined} key={duplicate ? "copy" : "primary"}>
            {marqueeItems.map((name) => (
              <button
                key={`${duplicate ? "copy-" : ""}${name}`}
                type="button"
                tabIndex={duplicate ? -1 : 0}
                onClick={() => navigate("shop", name)}
              >
                <span>{name}</span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ShopPage({ products, categories: availableCategories, loading, error, addToCart }) {
  const initialCategory = new URLSearchParams(window.location.search).get("category") || "All";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("featured");
  const filterCategories = ["All", ...availableCategories];
  const filtered = products.filter((product) => {
    const searchable = `${product.name} ${product.category} ${product.color} ${product.description}`.toLowerCase();
    const categoryMatch = category === "All" || searchable.includes(category.toLowerCase().replace(" wear", ""));
    return categoryMatch && searchable.includes(query.toLowerCase());
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price-low") return a.price - b.price;
    if (sort === "price-high") return b.price - a.price;
    if (sort === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div>
          <span className="eyebrow">The collection / {String(products.length).padStart(2, "0")} pieces</span>
          <h1>Shop all.</h1>
          <p>Premade Nigerian pieces, available for immediate ordering.</p>
        </div>
        {products[0] ? <img src={products[0].image} alt={products[0].name} loading="eager" decoding="async" fetchPriority="high" /> : null}
      </section>
      <section className="shop-workspace">
        <div className="shop-toolbar">
          <label className="shop-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inventory" />
          </label>
          <label className="sort-field">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
        <div className="category-tabs" aria-label="Catalog categories">
          {filterCategories.map((item) => (
            <button className={category === item ? "active" : ""} key={item} type="button" onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <p className="result-count">{sorted.length} {sorted.length === 1 ? "piece" : "pieces"}</p>
        <ProductGrid products={sorted} loading={loading} error={error} addToCart={addToCart} spacious />
      </section>
      <ServiceStrip />
    </div>
  );
}

function ProductGrid({ products, loading, error, addToCart, spacious = false, compact = false }) {
  if (loading) return <CatalogSkeleton />;
  if (error) return <div className="catalog-message error"><span>Catalog unavailable</span><p>{error}</p></div>;
  if (!products.length) return <div className="catalog-message"><span>No pieces found</span><p>Try another collection or search term.</p></div>;

  return (
    <div className={`product-grid ${spacious ? "product-grid-spacious" : ""} ${compact ? "product-grid-compact" : ""}`}>
      {products.map((product, index) => (
        <ProductCard product={product} addToCart={addToCart} key={product.id} priority={index < 3} compact={compact} />
      ))}
    </div>
  );
}

function ProductCard({ product, addToCart, priority, compact = false }) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const [size, setSize] = useState(sizes[0] || product.unit || "piece");
  return (
    <motion.article className={`product-card ${compact ? "product-card-compact" : ""}`} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      <div className="product-image-wrap">
        <img src={product.image} alt={product.name} loading={priority ? "eager" : "lazy"} decoding="async" fetchPriority={priority ? "high" : "auto"} />
      </div>
      <div className="product-title-row">
        <div><p>{product.category}</p><h3>{product.name}</h3></div>
        <strong>{currency(product.price)}</strong>
      </div>
      <p className="product-description">{product.description}</p>
      {sizes.length ? <div className="size-row" aria-label={`Choose a size for ${product.name}`}>{sizes.map((item) => (
        <button className={size === item ? "selected" : ""} type="button" key={item} onClick={() => setSize(item)}>{item}</button>
      ))}</div> : <p className="product-unit">Sold per {product.unit || "piece"}</p>}
      <button className="quick-add" type="button" onClick={() => addToCart(product, size)}>
        Quick add <Plus size={17} />
      </button>
    </motion.article>
  );
}

function FabricAccessoriesSection({ products, addToCart, navigate }) {
  const [filter, setFilter] = useState("All");
  const stock = products.filter((product) => product.productType === "fabric" || product.productType === "accessory");
  const filters = ["All", "Fabrics", "Headwear", "Jewellery"];
  const visible = filter === "All" ? stock : stock.filter((product) => product.category === filter);

  if (!stock.length) return null;

  return (
    <section className="materials-section">
      <div className="materials-intro">
        <div className="materials-copy">
          <span className="eyebrow">The materials edit / 01</span>
          <h2>Make it<br />your own.</h2>
          <p>Rooted in hand-dyed adire and handwoven aso oke. Shop heritage cloth by the yard, then finish the look with considered accessories.</p>
          <button className="text-link light-link" type="button" onClick={() => navigate("shop", "Fabrics")}>Shop all materials <ArrowRight size={16} /></button>
        </div>
        <div className="materials-texture" aria-label="Hand-dyed indigo textile" />
      </div>
      <div className="materials-catalog">
        <header><div><span className="eyebrow">Fabric & accessories</span><h3>From cloth to finishing touch.</h3></div><div className="materials-filters">{filters.map((item) => <button className={filter === item ? "active" : ""} type="button" onClick={() => setFilter(item)} key={item}>{item}</button>)}</div></header>
        <ProductGrid products={visible} addToCart={addToCart} compact />
      </div>
    </section>
  );
}

function TailoringSchoolSection({ school = DEFAULT_SCHOOL }) {
  const programs = school.programs?.length ? school.programs : DEFAULT_SCHOOL.programs;
  const message = [
    "Hello Moghene Tailoring School, I am interested in registering.",
    "",
    `Please share enrolment details for the available programmes: ${programs.join(", ")}.`,
    `Location: ${school.location}`,
  ].join("\n");
  const registrationUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <section className="tailoring-school">
      <div className="school-visual"><span>{school.visualCaption}</span></div>
      <div className="school-panel">
        <span className="eyebrow">{school.eyebrow}</span>
        <h2>{school.title}</h2>
        <p>{school.description}</p>
        <a className="school-whatsapp-button" href={registrationUrl} target="_blank" rel="noreferrer">Register on WhatsApp <ArrowRight size={17} /></a>
        <small>No forms—continue directly with our admissions team on WhatsApp.</small>
      </div>
    </section>
  );
}

function CatalogSkeleton() {
  return <div className="product-grid">{Array.from({ length: 6 }, (_, index) => <div className="product-skeleton" key={index} />)}</div>;
}

function LookbookPage({ products, lookbook, navigate }) {
  if (!lookbook?.heroProduct) {
    return <div className="lookbook-unavailable"><span className="eyebrow">Moghene editorial</span><h1>The next story is taking shape.</h1><button className="button button-paper" onClick={() => navigate("shop")}>Shop the collection <ArrowRight size={16} /></button></div>;
  }
  const looks = lookbook.finaleProducts?.length ? lookbook.finaleProducts : products.filter((product) => product.productType === "garment");
  const chapters = lookbook.chapters || [];
  return (
    <div className="lookbook-page">
      <section className="lookbook-hero" style={{ "--lookbook-image": `url("${lookbook.heroProduct.image}")` }}>
        <div className="lookbook-hero-copy">
          <span>{lookbook.eyebrow}</span>
          <h1>{lookbook.title}</h1>
        </div>
        <div className="lookbook-progress"><span>01</span><i /><span>{String(chapters.length).padStart(2, "0")}</span></div>
      </section>
      <section className="lookbook-manifesto">
        <h2>{lookbook.manifestoTitle}</h2>
        <p>{lookbook.manifestoCopy}</p>
      </section>
      <section className="lookbook-chapters">
        {chapters.map((chapter, index) => (
          <article className={`lookbook-chapter ${index % 2 ? "chapter-reverse" : ""}`} key={chapter.title}>
            <div className="chapter-copy">
              <span>{String(index + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}</span>
              <h2>{chapter.number}. {chapter.title}</h2>
              <p>{chapter.copy}</p>
              <div className="shop-the-look">
                <img src={chapter.product.image} alt="" loading="lazy" decoding="async" />
                <div><strong>{chapter.product.name}</strong><span>{currency(chapter.product.price)}</span></div>
              </div>
              <button className="button button-outline-light" type="button" onClick={() => navigate("shop")}>Shop this look <ArrowRight size={16} /></button>
            </div>
            <div className="chapter-image"><img src={chapter.product.image} alt={chapter.product.name} loading="lazy" decoding="async" /></div>
          </article>
        ))}
      </section>
      <section className="lookbook-finale">
        <div className="finale-images">
          {looks.slice(0, 5).map((product) => <img src={product.image} alt={product.name} key={product.id} loading="lazy" decoding="async" />)}
        </div>
        <div><span className="eyebrow">{lookbook.finaleEyebrow}</span><h2>{lookbook.finaleTitle}</h2><button className="button button-brass" onClick={() => navigate("shop")}>Discover the collection</button></div>
      </section>
      <ServiceStrip />
    </div>
  );
}

function ServiceStrip() {
  return (
    <section className="service-strip">
      <article><PackageCheck aria-hidden="true" /><div><h3>Ready to ship</h3><p>Select styles dispatch within 24–48 hours.</p></div></article>
      <article><Truck aria-hidden="true" /><div><h3>Nationwide delivery</h3><p>Delivery available across Nigeria.</p></div></article>
      <article><MessageCircleMore aria-hidden="true" /><div><h3>WhatsApp checkout</h3><p>One tap to complete your order in chat.</p></div></article>
    </section>
  );
}

function SiteFooter({ navigate, categories }) {
  return (
    <footer className="site-footer">
      <div className="footer-brand"><p className="wordmark">Moghene</p><span>Heritage textiles. Modern presence.</span></div>
      <div className="footer-links"><h3>Shop</h3><button onClick={() => navigate("shop")}>All pieces</button>{categories.slice(0, 4).map((item) => <button key={item} onClick={() => navigate("shop", item)}>{item}</button>)}</div>
      <div className="footer-links"><h3>Discover</h3><button onClick={() => navigate("lookbook")}>Lookbook</button><a href={`mailto:${STORE_EMAIL}`}>Contact</a><a href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram size={14} /> Instagram</a></div>
      <div className="footer-contact"><h3>Order assistance</h3><p>Questions about fit, delivery or a piece?</p><a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={15} /></a></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Moghene. All rights reserved.</span><span>Abuja, Nigeria</span></div>
    </footer>
  );
}

function CartDrawer({ cart, open, onClose, changeQuantity, removeItem, clearCart }) {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "" });
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lines = cart.map((item, index) => {
    const detail = item.productType === "garment" || !item.productType ? `size ${item.size} × ${item.quantity}` : `${item.quantity} ${item.unit}${item.quantity === 1 ? "" : "s"}`;
    return `${index + 1}. ${item.name} — ${detail} — ${currency(item.price * item.quantity)}`;
  });
  const message = [
    "Hello Moghene, I would like to place an order.", "", ...lines, "", `Total: ${currency(total)}`, "",
    `Name: ${customer.name || "Not provided"}`, `Phone: ${customer.phone || "Not provided"}`,
    `Delivery address: ${customer.address || "Not provided"}`, `Notes: ${customer.notes || "None"}`,
  ].join("\n");
  const checkoutUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside className="drawer-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Shopping bag">
          <button className="drawer-scrim" onClick={onClose} aria-label="Close bag" />
          <motion.div className="cart-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <header className="cart-header"><div><span>Your bag</span><h2>Bag ({String(cart.length).padStart(2, "0")})</h2></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
            <div className="cart-items">
              {cart.length ? cart.map((item) => (
                <article className="cart-item" key={`${item.productId}-${item.size}`}>
                  <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                  <div className="cart-item-copy"><h3>{item.name}</h3><p>{item.productType === "garment" || !item.productType ? `Size ${item.size}` : `Sold per ${item.unit}`}</p><strong>{currency(item.price * item.quantity)}</strong><div className="quantity-control"><button type="button" onClick={() => changeQuantity(item.productId, item.size, -1)}><Minus size={14} /></button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.productId, item.size, 1)}><Plus size={14} /></button></div></div>
                  <button className="remove-item" type="button" onClick={() => removeItem(item.productId, item.size)} aria-label={`Remove ${item.name}`}><Trash2 size={16} /></button>
                </article>
              )) : <div className="empty-bag"><ShoppingBag size={30} /><h3>Your bag is waiting.</h3><p>Add a piece, fabric or accessory to begin your order.</p><button type="button" onClick={onClose}>Continue shopping</button></div>}
            </div>
            {cart.length ? (
              <div className="cart-checkout">
                <div className="cart-total"><span>Subtotal</span><strong>{currency(total)}</strong></div>
                <details><summary>Delivery details <ChevronDown size={16} /></summary><div className="customer-fields"><input placeholder="Name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /><input placeholder="Phone" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /><textarea placeholder="Delivery address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} /><textarea placeholder="Order notes (optional)" value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} /></div></details>
                <a className="whatsapp-button" href={checkoutUrl} target="_blank" rel="noreferrer">Order on WhatsApp <ArrowRight size={17} /></a>
                <button className="clear-cart" type="button" onClick={clearCart}>Clear cart</button>
              </div>
            ) : null}
          </motion.div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function SearchOverlay({ open, products, onClose, addToCart }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const results = query.trim() ? products.filter((product) => `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(query.toLowerCase())).slice(0, 4) : [];
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <header><p className="wordmark">Moghene</p><button type="button" onClick={onClose} aria-label="Close search"><X /></button></header>
          <div className="search-inner">
            <span className="eyebrow">Search the collection</span>
            <label><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you looking for?" /></label>
            <div className="search-results">
              {query && !results.length ? <p>No matching pieces yet.</p> : null}
              {results.map((product) => <article key={product.id}><img src={product.image} alt={product.name} loading="lazy" decoding="async" /><div><h3>{product.name}</h3><p>{product.category} · {currency(product.price)}</p><button type="button" onClick={() => addToCart(product)}>Quick add <Plus size={14} /></button></div></article>)}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
