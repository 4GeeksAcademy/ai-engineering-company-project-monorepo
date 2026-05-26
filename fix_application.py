import re

with open('application2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace Head & Config
head_replacement = """    <!-- Modern Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        display: ['Syne', 'sans-serif'],
                    },
                    colors: {
                        'brasa-dark': '#0a0a0c',
                        'brasa-darker': '#050505',
                        'brasa-card': 'rgba(255, 255, 255, 0.03)',
                        'brasa-red': '#ff2a5f',
                        'brasa-red-hover': '#ff003c',
                        'brasa-gold': '#ff6b00',
                        'brasa-gold-light': '#ff9900',
                        'brasa-cream': '#ffffff',
                        'brasa-brown': 'rgba(255, 255, 255, 0.1)',
                        'brasa-orange': '#ff3300',
                        'brasa-ember': '#ff0055',
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'glow': 'glow 3s ease-in-out infinite alternate',
                        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        'blob': 'blob 10s infinite',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-15px)' },
                        },
                        glow: {
                            '0%': { opacity: '0.5', filter: 'blur(40px)' },
                            '100%': { opacity: '1', filter: 'blur(60px)' },
                        },
                        fadeInUp: {
                            '0%': { opacity: '0', transform: 'translateY(40px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
                        },
                        blob: {
                            '0%': { transform: 'translate(0px, 0px) scale(1)' },
                            '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                            '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                            '100%': { transform: 'translate(0px, 0px) scale(1)' }
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body {
            background-color: #050505;
            color: #ffffff;
            overflow-x: hidden;
        }
        h1, h2, h3, h4, .font-display, legend {
            font-family: 'Syne', sans-serif;
            letter-spacing: -0.02em;
        }
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-on-scroll.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        html { scroll-behavior: smooth; }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 30px 60px -10px rgba(0,0,0,0.5);
        }
        .glass-nav {
            background: rgba(5, 5, 5, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .glow-red { box-shadow: 0 0 40px rgba(255, 42, 95, 0.4), 0 0 80px rgba(255, 42, 95, 0.2); }
        .text-gradient {
            background: linear-gradient(135deg, #ff6b00, #ff2a5f, #ff9900);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 200% auto;
            animation: textGradient 5s linear infinite;
        }
        @keyframes textGradient {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
        }
        input, select, textarea {
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            backdrop-filter: blur(10px);
        }
        input:focus, select:focus, textarea:focus {
            border-color: #ff6b00 !important;
            box-shadow: 0 0 0 2px rgba(255, 107, 0, 0.3) !important;
        }
        option {
            background: #050505 !important;
            color: #ffffff !important;
        }
    </style>"""

html = re.sub(r'    <script src="https://cdn.tailwindcss.com"></script>.*?    </script>', head_replacement, html, flags=re.DOTALL)

# Header replacement
header_replacement = """<body class="font-sans antialiased text-white">

    <!-- Abstract Background Blobs -->
    <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div class="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-brasa-red/20 blur-[100px] animate-blob mix-blend-screen"></div>
        <div class="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-brasa-gold/20 blur-[120px] animate-blob mix-blend-screen" style="animation-delay: 2s"></div>
        <div class="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-brasa-orange/15 blur-[150px] animate-blob mix-blend-screen" style="animation-delay: 4s"></div>
    </div>

    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-50 glass-nav" role="banner">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20" aria-label="Navegación principal">
            <a href="index2.html" class="text-2xl md:text-3xl font-display font-extrabold tracking-tighter text-white hover:text-brasa-gold transition-colors" aria-label="Brasaland - Inicio">
                BRASALAND<span class="text-brasa-red">.</span>
            </a>

            <!-- Mobile menu button -->
            <button id="mobile-menu-btn" class="md:hidden p-2 rounded-md text-white hover:text-brasa-gold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
            </button>

            <!-- Desktop navigation -->
            <ul class="hidden md:flex items-center gap-10 text-sm font-semibold tracking-wide text-white/80" role="menubar">
                <li role="none"><a href="index2.html#menu" role="menuitem" class="hover:text-white transition-colors">EXPERIENCIA</a></li>
                <li role="none"><a href="index2.html#locales" role="menuitem" class="hover:text-white transition-colors">LOCALES</a></li>
                <li role="none"><a href="index2.html#nosotros" role="menuitem" class="hover:text-white transition-colors">NOSOTROS</a></li>
                <li role="none"><a href="index2.html#brasa-points" role="menuitem" class="hover:text-white transition-colors">REWARDS</a></li>
                <li role="none"><a href="application2.html" role="menuitem" class="text-brasa-gold transition-colors">TRABAJA CON NOSOTROS</a></li>
            </ul>

            <div class="hidden md:flex items-center gap-4">
                <a href="index2.html" class="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105">
                    Volver al Inicio
                </a>
            </div>
        </nav>

        <!-- Mobile menu -->
        <div id="mobile-menu" class="hidden md:hidden glass-nav border-t border-white/10" role="menu">
            <ul class="px-6 py-6 space-y-1 text-center">
                <li><a href="index2.html#menu" class="block py-3 text-white hover:text-brasa-gold hover:bg-white/5 rounded-lg transition-all font-semibold tracking-wide">EXPERIENCIA</a></li>
                <li><a href="index2.html#locales" class="block py-3 text-white hover:text-brasa-gold hover:bg-white/5 rounded-lg transition-all font-semibold tracking-wide">LOCALES</a></li>
                <li><a href="index2.html#nosotros" class="block py-3 text-white hover:text-brasa-gold hover:bg-white/5 rounded-lg transition-all font-semibold tracking-wide">NOSOTROS</a></li>
                <li><a href="index2.html#brasa-points" class="block py-3 text-white hover:text-brasa-gold hover:bg-white/5 rounded-lg transition-all font-semibold tracking-wide">REWARDS</a></li>
                <li><a href="application2.html" class="block py-3 text-brasa-gold hover:bg-white/5 rounded-lg transition-all font-semibold tracking-wide">TRABAJA CON NOSOTROS</a></li>
            </ul>
        </div>
    </header>"""

html = re.sub(r'<body.*?</header>', header_replacement, html, flags=re.DOTALL)

# Main container changes
html = html.replace('<main class="pt-20 md:pt-24">', '<main class="pt-24 relative z-10">')
html = html.replace('bg-brasa-dark', 'bg-transparent')
html = html.replace('bg-brasa-darker', 'bg-transparent')
html = html.replace('text-3xl md:text-5xl font-bold', 'text-4xl md:text-5xl font-display font-bold uppercase text-gradient')
html = html.replace('text-brasa-cream/70', 'text-white/70')
html = html.replace('text-brasa-cream', 'text-white')

# Replace form specifics
html = html.replace('bg-brasa-card border border-brasa-brown/50', 'glass-card')
html = html.replace('text-xl font-bold text-brasa-gold', 'text-xl font-display font-bold text-white')
html = html.replace('bg-brasa-red hover:bg-brasa-red-hover', 'bg-brasa-red hover:bg-brasa-red-hover glow-red hover:scale-105')

# Footer replacement
footer_replacement = """    <footer class="border-t border-white/10 pt-16 pb-8 mt-20 relative z-10 glass-nav border-none">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                <a href="index2.html" class="text-3xl font-display font-extrabold tracking-tighter text-white">
                    BRASALAND<span class="text-brasa-red">.</span>
                </a>
                <div class="flex gap-8 text-sm font-semibold tracking-wider uppercase text-white/60">
                    <a href="index2.html" class="hover:text-white transition-colors">INICIO</a>
                    <a href="#" class="hover:text-white transition-colors">PRIVACY</a>
                    <a href="#" class="hover:text-white transition-colors">TERMS</a>
                </div>
            </div>
            <div class="text-center text-xs font-semibold text-white/40 uppercase tracking-widest">
                <p>© 2024 BRASALAND EST. 2008</p>
            </div>
        </div>
    </footer>

    <!-- Mobile Menu Script -->
    <script>
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
                menuBtn.setAttribute('aria-expanded', !isExpanded);
                mobileMenu.classList.toggle('hidden');
            });

            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    menuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }
    </script>"""

html = re.sub(r'<footer.*?</footer>(.*?)<script>.*?</script>', footer_replacement + r'\1', html, flags=re.DOTALL)

# Ensure "index.html" references are updated to "index2.html" inside main
html = html.replace('href="index.html"', 'href="index2.html"')

with open('application2.html', 'w', encoding='utf-8') as f:
    f.write(html)
