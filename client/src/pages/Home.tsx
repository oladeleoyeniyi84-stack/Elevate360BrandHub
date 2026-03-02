import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, ArrowRight, Smartphone, BookOpen, Star, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

import heroBg from "@/assets/images/hero-bg.png";
import appBondedlove from "@/assets/images/app-bondedlove.png";
import appHealthwise from "@/assets/images/app-healthwise.png";
import appVideoCrafter from "@/assets/images/app-videocrafter.png";
import brandLogo from "@assets/Elevate360_Brand_Logo_1772418122164.png";

// Real Amazon Book Covers
const bookMockup = "https://m.media-amazon.com/images/I/41Ih48BpUEL._SY445_SX342_FMwebp_.jpg";
const featuredBook = "https://m.media-amazon.com/images/I/41Ih48BpUEL._SY445_SX342_FMwebp_.jpg";
const bookTogether = "https://m.media-amazon.com/images/I/61XmcRNAyTL._SY466_.jpg";
const bookOneCleanMeal = "https://m.media-amazon.com/images/I/41zbjQDKkNL._SY466_.jpg";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          isScrolled
            ? "bg-background/80 backdrop-blur-md border-border py-4"
            : "bg-transparent border-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center gap-2">
              <img src={brandLogo} alt="Elevate360" className="h-16 md:h-20 w-auto object-contain" />
            </a>
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#apps" className="text-sm font-medium hover:text-primary transition-colors">
              Applications
            </a>
            <a href="#books" className="text-sm font-medium hover:text-primary transition-colors">
              Publications
            </a>
            <Button className="rounded-full px-6">Get in Touch</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Abstract Background" 
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background to-background"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Innovating digital experiences
            </div>
            
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Empowering Lives Through <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Technology & Words
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Welcome to the official portfolio of Elevate360. Discover our suite of transformative mobile applications and insightful Amazon publications designed to elevate your everyday life.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Button size="lg" className="rounded-full px-8 w-full sm:w-auto text-base h-14 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <a href="#apps">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Explore Apps
                </a>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 w-full sm:w-auto text-base h-14 border-secondary text-secondary hover:bg-secondary/10" asChild>
                <a href="#books">
                  <BookOpen className="mr-2 h-5 w-5" />
                  View Publications
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <section id="apps" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">Our Digital Ecosystem</h2>
            <p className="text-lg text-muted-foreground">
              Purpose-built applications designed to connect, heal, and inspire creativity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Bondedlove */}
            <div className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
              <div className="aspect-[4/3] w-full overflow-hidden bg-rose-50 flex items-center justify-center p-8">
                <img 
                  src={appBondedlove} 
                  alt="Bondedlove App" 
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center mb-6">
                  <div className="w-6 h-6 bg-rose-500 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3">Bondedlove</h3>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  A revolutionary dating application focused on fostering genuine, lasting connections. Find your perfect match through meaningful interactions.
                </p>
                <a href="#" className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors">
                  Learn more <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Healthwisesupport */}
            <div className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
              <div className="aspect-[4/3] w-full overflow-hidden bg-teal-50 flex items-center justify-center p-8">
                <img 
                  src={appHealthwise} 
                  alt="Healthwisesupport App" 
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center mb-6">
                  <div className="w-6 h-6 bg-teal-500 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3">Healthwisesupport</h3>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  Your comprehensive health wellness companion. Access medical support, track your wellness journey, and connect with healthcare professionals.
                </p>
                <a href="#" className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors">
                  Learn more <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Video Crafter */}
            <div className="group relative rounded-3xl overflow-hidden bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
              <div className="aspect-[4/3] w-full overflow-hidden bg-indigo-50 flex items-center justify-center p-8">
                <img 
                  src={appVideoCrafter} 
                  alt="Video Crafter App" 
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-6">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold font-heading mb-3">Video Crafter</h3>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  Unleash your creativity with our intuitive video editing suite. Professional-grade tools made accessible for creators of all levels.
                </p>
                <a href="#" className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors">
                  Learn more <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publications Section */}
      <section id="books" className="pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-16 mb-16">
            <div className="w-full md:w-1/2 space-y-8">
              <div className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-600 mb-2">
                Available on Amazon KDP
              </div>
              <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight">
                Insights & Inspiration
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Dive deep into our collection of eBooks and hardcover publications. Whether you're looking for guidance, knowledge, or inspiration, our carefully crafted books are designed to elevate your understanding.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Expertly researched content",
                  "Available in digital and physical formats",
                  "Actionable insights for personal growth",
                  "Highly rated by readers globally"
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-foreground font-medium">
                    <div className="mr-3 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      ✓
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              
              <div className="pt-4">
                <Button size="lg" className="rounded-full px-8 h-14 bg-[#FF9900] hover:bg-[#FF9900]/90 text-black font-semibold" asChild>
                  <a href="https://kdp.amazon.com/en_US/bookshelf?ref_=kdp_kdp_TAC_TN_bs" target="_blank" rel="noopener noreferrer">
                    Visit Author Central on Amazon
                  </a>
                </Button>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 relative">
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <img 
                  src={featuredBook} 
                  alt="Healthwise: Stay Healthy" 
                  className="w-full h-auto rounded-xl shadow-xl transform translate-y-8 hover:-translate-y-2 transition-transform duration-500"
                />
                <div className="space-y-4">
                  <img 
                    src={bookTogether} 
                    alt="Together: Let There Be Love" 
                    className="w-full h-auto rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-500"
                  />
                  <img 
                    src={bookOneCleanMeal} 
                    alt="One Clean Meal" 
                    className="w-full h-auto rounded-xl shadow-xl hover:-translate-y-2 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-transparent rounded-[3rem] -rotate-6 scale-105 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Book Section - Healthwise */}
      <section className="pb-24 pt-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="bg-card border rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img 
                    src={featuredBook} 
                    alt="Featured Book Cover" 
                    className="relative w-64 md:w-72 h-auto rounded-md shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] group-hover:-rotate-2"
                  />
                  
                  {/* Bestseller badge */}
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-12">
                    #1 Bestseller
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-6">
                <div className="flex items-center space-x-1 text-amber-500 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                  <span className="text-muted-foreground text-sm ml-2 font-medium">(4.9/5 from 1.2k Reviews)</span>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-3">Featured Release</h3>
                  <h4 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight mb-4">
                    Healthwise: <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">Stay Healthy</span>
                  </h4>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Your body has been speaking to you for years. Are you finally ready to listen? Healthwise: A Practical Guide to Understanding Your Body and Protecting Your Health walks you through how your body is organized, why common symptoms appear, and how everyday choices quietly shape your long-term wellbeing.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button size="lg" className="rounded-full px-8 bg-[#232F3E] text-white hover:bg-[#131A22] h-14 text-base font-semibold border border-transparent shadow-lg hover:shadow-xl transition-all" asChild>
                    <a href="https://www.amazon.com/dp/B0GMBNPZC9" target="_blank" rel="noopener noreferrer">
                      Buy on Amazon
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base font-medium">
                    Read Sample Chapter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Book Section - Together: Let There Be Love */}
      <section className="pb-24 pt-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-rose-400/5 to-transparent rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-4 bg-gradient-to-l from-rose-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img 
                    src={bookTogether} 
                    alt="Together: Let There Be Love Cover" 
                    className="relative w-64 md:w-72 h-auto rounded-md shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] group-hover:rotate-2"
                  />
                  <div className="absolute -top-4 -left-4 bg-gradient-to-r from-rose-400 to-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform -rotate-12">
                    5.0 ⭐ Rating
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-6">
                <div className="flex items-center space-x-1 text-amber-500 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                  <span className="text-muted-foreground text-sm ml-2 font-medium">(5.0/5 Reviews)</span>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-rose-500 uppercase mb-3">Relationships & Marriage</h3>
                  <h4 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight mb-4">
                    Together: <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">Let There Be Love</span>
                  </h4>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Are you tired of feeling like roommates instead of soulmates? Together: Let There Be Love is a practical, heart-centered relationship handbook for couples who are ready to build deeper connection, healthier communication, and a love that actually lasts.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button size="lg" className="rounded-full px-8 bg-[#232F3E] text-white hover:bg-[#131A22] h-14 text-base font-semibold border border-transparent shadow-lg hover:shadow-xl transition-all" asChild>
                    <a href="https://www.amazon.com/dp/B0G5DWG61V" target="_blank" rel="noopener noreferrer">
                      Buy on Amazon
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Book Section - One Clean Meal */}
      <section className="pb-24 pt-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-emerald-400/5 to-transparent rounded-full blur-3xl translate-y-1/3 translate-x-1/3"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative group perspective-1000">
                  <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <img 
                    src={bookOneCleanMeal} 
                    alt="One Clean Meal Cover" 
                    className="relative w-64 md:w-72 h-auto rounded-md shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] group-hover:-rotate-2"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transform rotate-6">
                    New Release
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-2/3 space-y-6">
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-3">Diet & Weight Loss</h3>
                  <h4 className="text-3xl md:text-5xl font-heading font-extrabold tracking-tight mb-4">
                    One Clean Meal: <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">A 7-Day Reset</span>
                  </h4>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Simple daily habits for better health & energy. Kickstart your wellness journey with actionable, easy-to-follow steps to improve your diet without the overwhelm. Perfect for busy adults looking to reset their health through manageable, one-meal-at-a-time changes.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button size="lg" className="rounded-full px-8 bg-[#232F3E] text-white hover:bg-[#131A22] h-14 text-base font-semibold border border-transparent shadow-lg hover:shadow-xl transition-all" asChild>
                    <a href="https://www.amazon.com/dp/B0FSDTPVJC" target="_blank" rel="noopener noreferrer">
                      Buy on Amazon
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tight mb-6 text-white">
            Ready to Elevate Your Experience?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
            Join thousands of users who are already transforming their daily lives with our applications and publications.
          </p>
          <Button size="lg" variant="secondary" className="rounded-full px-10 h-14 text-base font-bold text-primary">
            Explore All Products
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <a className="flex items-center gap-2 mb-4">
                <img src={brandLogo} alt="Elevate360" className="h-12 md:h-16 w-auto object-contain" />
              </a>
              <p className="text-muted-foreground text-sm mt-2">
                © {new Date().getFullYear()} Elevate360. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <a href="https://www.instagram.com/officialelevate360/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}