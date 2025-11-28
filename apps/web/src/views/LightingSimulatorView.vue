<script setup lang="ts">
</script>

<template>
  <div class="flex h-screen bg-gray-900">
    <!-- Left: HTML Sample -->
    <div class="w-1/2 overflow-auto bg-white">
      <div class="sample-html p-6">
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

        <!-- Content Grid -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="bg-red-100 p-4 rounded-lg">
            <div class="bg-red-500 text-white p-3 rounded mb-2">
              <h3 class="font-bold">Card 1</h3>
            </div>
            <p class="text-gray-700 text-sm">Some content here with nested elements.</p>
          </div>
          <div class="bg-green-100 p-4 rounded-lg">
            <div class="bg-green-500 text-white p-3 rounded mb-2">
              <h3 class="font-bold">Card 2</h3>
            </div>
            <p class="text-gray-700 text-sm">Another card with different styling.</p>
          </div>
          <div class="bg-blue-100 p-4 rounded-lg">
            <div class="bg-blue-500 text-white p-3 rounded mb-2">
              <h3 class="font-bold">Card 3</h3>
            </div>
            <p class="text-gray-700 text-sm">Third card to show depth.</p>
          </div>
        </div>

        <!-- Nested Structure -->
        <div class="bg-gray-100 p-4 rounded-lg mb-6">
          <div class="bg-gray-200 p-4 rounded-lg">
            <div class="bg-gray-300 p-4 rounded-lg">
              <div class="bg-gray-400 p-4 rounded-lg">
                <div class="bg-gray-500 text-white p-4 rounded-lg text-center">
                  Deeply Nested Element (5 levels)
                </div>
              </div>
            </div>
          </div>
        </div>

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
    </div>

    <!-- Right: Canvas Simulation -->
    <div class="w-1/2 flex items-center justify-center bg-gray-800">
      <div class="text-gray-500 text-lg">
        Canvas Simulation (Coming Soon)
      </div>
    </div>
  </div>
</template>
