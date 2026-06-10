import ChatWidget from './components/ChatWidget';

interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  rating: string;
  gradient: string;
}

export default function App() {
  const products: Product[] = [
    {
      id: 1,
      name: "Saddle Leather Desk Mat",
      category: "Workspace Essentials",
      price: "$79.00",
      rating: "4.9",
      gradient: "from-amber-700/40 to-orange-900/40"
    },
    {
      id: 2,
      name: "Ergonomic Aluminum Stand",
      category: "Hardware Mounts",
      price: "$59.00",
      rating: "4.8",
      gradient: "from-slate-700/40 to-slate-900/40"
    },
    {
      id: 3,
      name: "Magnetic Key Organizer",
      category: "Daily Carry",
      price: "$29.00",
      rating: "4.7",
      gradient: "from-indigo-900/40 to-slate-800/40"
    },
    {
      id: 4,
      name: "Carbon Fiber Tech Pouch",
      category: "Travel Gear",
      price: "$45.00",
      rating: "4.9",
      gradient: "from-purple-950/40 to-slate-900/40"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/10">
              S
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
              SPUR GOODS
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#shop" className="hover:text-slate-100 transition-colors">SHOP</a>
            <a href="#about" className="hover:text-slate-100 transition-colors">ABOUT</a>
            <a href="#support" className="hover:text-slate-100 transition-colors">SUPPORT</a>
          </nav>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
              Spur Shop v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24 border-b border-slate-900">
        {/* Glow ambient background assets */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15]">
            Refine Your Workspace,{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Empower Your Craft
            </span>
          </h1>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Beautifully designed, highly functional desk mats, mounts, and everyday carry gear for contemporary workspaces. Seeded with high-quality materials.
          </p>
          <div className="pt-4 flex items-center justify-center gap-4">
            <a 
              href="#shop" 
              className="px-6 py-2.5 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-lg shadow-white/5 hover:-translate-y-[1px]"
            >
              BROWSE CATALOG
            </a>
            <a 
              href="#support" 
              className="px-6 py-2.5 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850 rounded-xl text-xs font-semibold tracking-wide border border-slate-800 transition-all hover:-translate-y-[1px]"
            >
              LEARN POLICIES
            </a>
          </div>
        </div>
      </section>

      {/* Products Catalog Section */}
      <main id="shop" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 relative z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Featured Releases</h2>
          <p className="text-xs text-slate-400 mt-1">Explore our current inventory of workspace companions.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div 
              key={product.id}
              className="group bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-2xl p-4 flex flex-col space-y-4 hover:bg-slate-900/80 transition-all duration-300 shadow-sm"
            >
              {/* Product Image Placeholder Grid Card */}
              <div className={`aspect-square rounded-xl bg-gradient-to-br ${product.gradient} border border-slate-800/40 flex items-center justify-center relative overflow-hidden group-hover:scale-[1.01] transition-transform`}>
                <span className="text-slate-600 font-medium text-xs tracking-wider group-hover:text-slate-500 transition-colors">
                  {product.category.toUpperCase()}
                </span>
              </div>

              {/* Product Meta */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase">
                    {product.category}
                  </span>
                  <h3 className="font-semibold text-slate-200 text-sm tracking-tight group-hover:text-white transition-colors">
                    {product.name}
                  </h3>
                </div>
                
                <div className="flex items-center justify-between pt-4 mt-auto">
                  <span className="font-bold text-slate-100 text-sm">
                    {product.price}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/5 px-2 py-0.5 rounded-lg border border-amber-400/10">
                    ★ {product.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-bold text-slate-300">SPUR GOODS</span>
            <p className="mt-1 text-[10px]">Customer engagement & support simulator demo.</p>
          </div>
          
          <div className="flex items-center gap-8">
            <p>Support Hours: Mon-Fri 9AM - 6PM EST</p>
            <p>© 2026 Spur Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Interactive AI Chat Support Widget */}
      <ChatWidget />
    </div>
  );
}
