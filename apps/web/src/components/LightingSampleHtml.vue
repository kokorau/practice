<template>
  <div class="p-6">
    <!-- Header -->
    <header class="bg-slate-800 text-white p-4 rounded-lg mb-6">
      <nav class="flex items-center justify-between">
        <div class="text-xl font-bold">Sample Site</div>
        <ul class="flex gap-4">
          <li><a href="#" class="hover:text-blue-300">Home</a></li>
          <li><a href="#" class="hover:text-blue-300">About</a></li>
          <li><a href="#" class="hover:text-blue-300">Contact</a></li>
        </ul>
      </nav>
    </header>

    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-lg mb-6">
      <h1 class="text-3xl font-bold mb-4">Welcome to Our Site</h1>
      <p class="text-lg mb-4">This is a sample HTML structure for lighting simulation.</p>
      <button class="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold">
        Get Started
      </button>
    </section>

    <!-- Color Palette Section -->
    <section class="mb-6">
      <h2 class="text-lg font-bold mb-3 text-gray-800">Color Palette</h2>
      <div class="grid grid-cols-6 gap-2 mb-4">
        <!-- Primary Colors -->
        <div class="bg-red-500 h-16 rounded-lg"></div>
        <div class="bg-orange-500 h-16 rounded-lg"></div>
        <div class="bg-yellow-500 h-16 rounded-lg"></div>
        <div class="bg-green-500 h-16 rounded-lg"></div>
        <div class="bg-blue-500 h-16 rounded-lg"></div>
        <div class="bg-purple-500 h-16 rounded-lg"></div>
      </div>
      <div class="grid grid-cols-6 gap-2 mb-4">
        <!-- Pastel Colors -->
        <div class="bg-red-200 h-12 rounded-lg"></div>
        <div class="bg-orange-200 h-12 rounded-lg"></div>
        <div class="bg-yellow-200 h-12 rounded-lg"></div>
        <div class="bg-green-200 h-12 rounded-lg"></div>
        <div class="bg-blue-200 h-12 rounded-lg"></div>
        <div class="bg-purple-200 h-12 rounded-lg"></div>
      </div>
      <div class="grid grid-cols-6 gap-2">
        <!-- Dark Colors -->
        <div class="bg-red-800 h-12 rounded-lg"></div>
        <div class="bg-orange-800 h-12 rounded-lg"></div>
        <div class="bg-yellow-800 h-12 rounded-lg"></div>
        <div class="bg-green-800 h-12 rounded-lg"></div>
        <div class="bg-blue-800 h-12 rounded-lg"></div>
        <div class="bg-purple-800 h-12 rounded-lg"></div>
      </div>
    </section>

    <!-- Border Radius Variations -->
    <section class="mb-6">
      <h2 class="text-lg font-bold mb-3 text-gray-800">Border Radius</h2>
      <div class="flex gap-4 items-end">
        <div class="bg-indigo-500 w-20 h-20 rounded-none"></div>
        <div class="bg-indigo-500 w-20 h-20 rounded-sm"></div>
        <div class="bg-indigo-500 w-20 h-20 rounded-md"></div>
        <div class="bg-indigo-500 w-20 h-20 rounded-lg"></div>
        <div class="bg-indigo-500 w-20 h-20 rounded-xl"></div>
        <div class="bg-indigo-500 w-20 h-20 rounded-2xl"></div>
        <div class="bg-indigo-500 w-20 h-20 rounded-full"></div>
      </div>
    </section>

    <!-- Depth Comparison -->
    <section class="mb-6">
      <h2 class="text-lg font-bold mb-3 text-gray-800">Depth Comparison</h2>
      <div class="flex gap-4">
        <!-- Level 1 -->
        <div class="bg-cyan-100 p-3 rounded-lg flex-1">
          <div class="text-xs text-cyan-800 mb-1">Depth 1</div>
          <div class="bg-cyan-400 h-16 rounded-lg"></div>
        </div>
        <!-- Level 2 -->
        <div class="bg-cyan-100 p-3 rounded-lg flex-1">
          <div class="text-xs text-cyan-800 mb-1">Depth 2</div>
          <div class="bg-cyan-200 p-2 rounded-lg">
            <div class="bg-cyan-400 h-12 rounded-lg"></div>
          </div>
        </div>
        <!-- Level 3 -->
        <div class="bg-cyan-100 p-3 rounded-lg flex-1">
          <div class="text-xs text-cyan-800 mb-1">Depth 3</div>
          <div class="bg-cyan-200 p-2 rounded-lg">
            <div class="bg-cyan-300 p-2 rounded-lg">
              <div class="bg-cyan-400 h-8 rounded-lg"></div>
            </div>
          </div>
        </div>
        <!-- Level 4 -->
        <div class="bg-cyan-100 p-3 rounded-lg flex-1">
          <div class="text-xs text-cyan-800 mb-1">Depth 4</div>
          <div class="bg-cyan-200 p-1.5 rounded-lg">
            <div class="bg-cyan-300 p-1.5 rounded-lg">
              <div class="bg-cyan-400 p-1.5 rounded-lg">
                <div class="bg-cyan-500 h-4 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Card Grid with Various Colors -->
    <section class="mb-6">
      <h2 class="text-lg font-bold mb-3 text-gray-800">Card Components</h2>
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-rose-50 p-4 rounded-xl">
          <div class="bg-rose-500 text-white p-3 rounded-lg mb-2">
            <h3 class="font-bold">Rose Card</h3>
          </div>
          <p class="text-gray-600 text-sm">Warm rose tones</p>
        </div>
        <div class="bg-emerald-50 p-4 rounded-xl">
          <div class="bg-emerald-500 text-white p-3 rounded-lg mb-2">
            <h3 class="font-bold">Emerald Card</h3>
          </div>
          <p class="text-gray-600 text-sm">Fresh green colors</p>
        </div>
        <div class="bg-sky-50 p-4 rounded-xl">
          <div class="bg-sky-500 text-white p-3 rounded-lg mb-2">
            <h3 class="font-bold">Sky Card</h3>
          </div>
          <p class="text-gray-600 text-sm">Cool blue shades</p>
        </div>
        <div class="bg-amber-50 p-4 rounded-xl">
          <div class="bg-amber-500 text-white p-3 rounded-lg mb-2">
            <h3 class="font-bold">Amber Card</h3>
          </div>
          <p class="text-gray-600 text-sm">Golden amber tones</p>
        </div>
        <div class="bg-violet-50 p-4 rounded-xl">
          <div class="bg-violet-500 text-white p-3 rounded-lg mb-2">
            <h3 class="font-bold">Violet Card</h3>
          </div>
          <p class="text-gray-600 text-sm">Rich purple hues</p>
        </div>
        <div class="bg-slate-100 p-4 rounded-xl">
          <div class="bg-slate-700 text-white p-3 rounded-lg mb-2">
            <h3 class="font-bold">Slate Card</h3>
          </div>
          <p class="text-gray-600 text-sm">Neutral slate gray</p>
        </div>
      </div>
    </section>

    <!-- Nested Structure -->
    <section class="mb-6">
      <h2 class="text-lg font-bold mb-3 text-gray-800">Deep Nesting</h2>
      <div class="bg-gray-100 p-4 rounded-lg">
        <div class="bg-gray-200 p-4 rounded-lg">
          <div class="bg-gray-300 p-4 rounded-lg">
            <div class="bg-gray-400 p-4 rounded-lg">
              <div class="bg-gray-500 text-white p-4 rounded-lg text-center">
                Deeply Nested (5 levels)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Size Variations -->
    <section class="mb-6">
      <h2 class="text-lg font-bold mb-3 text-gray-800">Size Variations</h2>
      <div class="flex items-end gap-3">
        <div class="bg-pink-500 w-8 h-8 rounded-lg"></div>
        <div class="bg-pink-500 w-12 h-12 rounded-lg"></div>
        <div class="bg-pink-500 w-16 h-16 rounded-lg"></div>
        <div class="bg-pink-500 w-24 h-24 rounded-lg"></div>
        <div class="bg-pink-500 w-32 h-20 rounded-lg"></div>
        <div class="bg-pink-500 w-20 h-32 rounded-lg"></div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-slate-900 text-gray-400 p-6 rounded-lg">
      <div class="flex justify-between">
        <div>
          <h4 class="text-white font-bold mb-2">Company</h4>
          <ul class="space-y-1 text-sm">
            <li>About Us</li>
            <li>Careers</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 class="text-white font-bold mb-2">Resources</h4>
          <ul class="space-y-1 text-sm">
            <li>Documentation</li>
            <li>Blog</li>
            <li>Support</li>
          </ul>
        </div>
        <div>
          <h4 class="text-white font-bold mb-2">Legal</h4>
          <ul class="space-y-1 text-sm">
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
          </ul>
        </div>
      </div>
    </footer>
  </div>
</template>
