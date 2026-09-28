import { type StaticImageData } from "next/image";

// Men's Collection Images
import bolerosFrontImg from "@/app/assets/images/products/men/gwago-boleros-front.jpg";
import bolerosBackImg from "@/app/assets/images/products/men/gwago-boleros-back.jpg";
import compoundHoodieFrontImg from "@/app/assets/images/products/men/gwago-compound-hoodie-front.jpg";
import compoundHoodieBackImg from "@/app/assets/images/products/men/gwago-compound-hoodie-back.jpg";
import mcbFrontImg from "@/app/assets/images/products/men/gwago-mcb-front.jpg";
import mcbBackImg from "@/app/assets/images/products/men/gwago-mcb-back.jpg";
import molaveFrontImg from "@/app/assets/images/products/men/gwago-molave-front.jpg";
import molaveBackImg from "@/app/assets/images/products/men/gwago-molave-back.jpg";
import stingersFrontImg from "@/app/assets/images/products/men/gwago-stingers-front.jpg";
import stingersBackImg from "@/app/assets/images/products/men/gwago-stingers-back.jpg";
import suoicerpFrontImg from "@/app/assets/images/products/men/gwago-suoicerp-front.jpg";
import suoicerpBackImg from "@/app/assets/images/products/men/gwago-suoicerp-back.jpg";
import yonkoFrontImg from "@/app/assets/images/products/men/gwago-yonko-front.jpg";
import yonkoBackImg from "@/app/assets/images/products/men/gwago-yonko-back.jpg";

// Women's Collection Images
import vbwJerseyFrontImg from "@/app/assets/images/products/women/gwago-vbw-jersey-front.jpg";
import vbwJerseyBackImg from "@/app/assets/images/products/women/gwag-vbw-jersey-back.jpg";
import futsalwFrontImg from "@/app/assets/images/products/women/gwago-futsalw-front.jpg";
import futsalwBackImg from "@/app/assets/images/products/women/gwago-futsalw-back.jpg";
import mhpnhsFrontImg from "@/app/assets/images/products/women/gwago-mhpnhs-front.jpg";
import mhpnhsBackImg from "@/app/assets/images/products/women/gwago-mhpnhs-back.jpg";
import synergywFrontImg from "@/app/assets/images/products/women/gwago-synergyw-front.jpg";
import synergywBackImg from "@/app/assets/images/products/women/gwago-synergyw-back.jpg";

export type CatalogCategorySlug = "all" | "jerseys" | "hoodies" | "polos" | "tees";

export interface CatalogCategory {
  slug: CatalogCategorySlug;
  label: string;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { slug: "all", label: "All Items" },
  { slug: "jerseys", label: "Jerseys" },
  { slug: "hoodies", label: "Hoodies" },
  { slug: "polos", label: "Polos" },
  { slug: "tees", label: "Streetwear" },
];

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  categorySlug: Exclude<CatalogCategorySlug, "all">;
  price: number;
  priceFormatted: string;
  frontImage: StaticImageData;
  backImage: StaticImageData;
  description: string;
  fabric: string;
  printTech: string;
  fit: string;
  sizes: string[];
  featured?: boolean;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: "gwago-compound-hoodie",
    name: "Compound Pullover Hoodie",
    category: "Hoodie",
    categorySlug: "hoodies",
    price: 650,
    priceFormatted: "Php 650.00",
    frontImage: compoundHoodieFrontImg,
    backImage: compoundHoodieBackImg,
    description:
      "Heavyweight brushed fleece built for post-game cool-downs and streetwear layering. Oversized double-lined hood, heavy-duty kangaroo pocket, and rib-knit cuffs that hold their structure.",
    fabric: "80% Cotton / 20% Poly Fleece (330 GSM)",
    printTech: "Direct-to-Film & High-Density Screenprint",
    fit: "Relaxed Boxy Fit",
    sizes: ["S", "M", "L", "XL", "2XL"],
    featured: true,
  },
  {
    id: "gwago-molave-polo",
    name: "Molave Zipper Polo",
    category: "Polo",
    categorySlug: "polos",
    price: 450,
    priceFormatted: "Php 450.00",
    frontImage: molaveFrontImg,
    backImage: molaveBackImg,
    description:
      "Modern coaching and tournament team polo. Features a sleek matte-black quarter-zip placket, structured flat-knit collar, and breathable honeycomb knit engineered to stay crisp in humid arenas.",
    fabric: "Honeycomb Poly-Dry (200 GSM)",
    printTech: "Precision Panel Sublimation",
    fit: "Tailored Standard Fit",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    featured: true,
  },
  {
    id: "gwago-vbw-jersey",
    name: "VBW Volleyball Jersey",
    category: "Jersey",
    categorySlug: "jerseys",
    price: 650,
    priceFormatted: "Php 650.00",
    frontImage: vbwJerseyFrontImg,
    backImage: vbwJerseyBackImg,
    description:
      "Women's elite volleyball competition jersey engineered for rapid lateral movement and maximum jump extension. Breathable high-stretch construction with ergonomic flatlock seams.",
    fabric: "Performance Spandex Mesh (175 GSM)",
    printTech: "Zero-Hand High-Definition Sublimation",
    fit: "Athletic Cut",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    featured: true,
  },
  {
    id: "gwago-stingers-tee",
    name: "TVL Stingers Jersey Tee",
    category: "Streetwear",
    categorySlug: "tees",
    price: 380,
    priceFormatted: "Php 380.00",
    frontImage: stingersFrontImg,
    backImage: stingersBackImg,
    description:
      "Lightweight athletic training tee designed for warm-ups, fan gear, and casual courtwear. Ultra-breathable interlock knit with four-way stretch and anti-chafing flatlock hems.",
    fabric: "Interlock DryTech Polyester (160 GSM)",
    printTech: "Full Sublimation Print",
    fit: "Standard Athletic",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    featured: true,
  },

  {
    id: "gwago-mcb-hoodie",
    name: "MCB Basketball Hoodie",
    category: "Hoodie",
    categorySlug: "hoodies",
    price: 650,
    priceFormatted: "Php 650.00",
    frontImage: mcbFrontImg,
    backImage: mcbBackImg,
    description:
      "Heavyweight brushed fleece basketball hoodie built for warm-ups, post-game cool-downs, and streetwear layering. Features a structured hood and kangaroo pocket.",
    fabric: "80% Cotton / 20% Poly Fleece (330 GSM)",
    printTech: "Direct-to-Film & High-Density Screenprint",
    fit: "Relaxed Boxy Fit",
    sizes: ["S", "M", "L", "XL", "2XL"],
  },
  {
    id: "gwago-boleros-tee",
    name: "Boleros Streetwear Tee",
    category: "Streetwear",
    categorySlug: "tees",
    price: 420,
    priceFormatted: "Php 420.00",
    frontImage: bolerosFrontImg,
    backImage: bolerosBackImg,
    description:
      "Everyday lifestyle streetwear staple. Heavyweight collar ribbing, relaxed dropped shoulders, and premium combed cotton crafted for unmatched daily comfort.",
    fabric: "100% Combed Cotton (220 GSM)",
    printTech: "Silkscreen & High-Density Graphic",
    fit: "Oversized Street Fit",
    sizes: ["S", "M", "L", "XL", "2XL"],
  },
  {
    id: "gwago-suoicerp-tee",
    name: "Suoicerp Streetwear Tee",
    category: "Streetwear",
    categorySlug: "tees",
    price: 420,
    priceFormatted: "Php 420.00",
    frontImage: suoicerpFrontImg,
    backImage: suoicerpBackImg,
    description:
      "Everyday lifestyle streetwear tee. Premium heavyweight cotton with bold graphic accents and a structured relaxed silhouette.",
    fabric: "100% Combed Cotton (220 GSM)",
    printTech: "Silkscreen & High-Density Graphic",
    fit: "Oversized Street Fit",
    sizes: ["S", "M", "L", "XL", "2XL"],
  },
  {
    id: "gwago-yonko-tee",
    name: "Yonko Gaming Hub Tee",
    category: "Streetwear",
    categorySlug: "tees",
    price: 420,
    priceFormatted: "Php 420.00",
    frontImage: yonkoFrontImg,
    backImage: yonkoBackImg,
    description:
      "Official Yonko Gaming Hub streetwear tee. High-grade breathable cotton-poly blend crafted for long gaming sessions and everyday court lifestyle.",
    fabric: "Double-Knit Cotton Poly (210 GSM)",
    printTech: "High-Definition Screenprint & Sublimation",
    fit: "Modern Boxy Street Fit",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
  },

  {
    id: "gwago-futsal-women",
    name: "Futsal Women's Jersey",
    category: "Jersey",
    categorySlug: "jerseys",
    price: 620,
    priceFormatted: "Php 620.00",
    frontImage: futsalwFrontImg,
    backImage: futsalwBackImg,
    description:
      "Tailored specifically for women's indoor and futsal competition. Features tapered waist contours, anti-snag smooth interlock fabric, and rapid moisture dispersal.",
    fabric: "SpeedDry Interlock Poly (165 GSM)",
    printTech: "High-Definition Sublimation",
    fit: "Women's Active Fit",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
  },
  {
    id: "gwago-mhpnhs-jersey",
    name: "MHPNHS Women's Jersey",
    category: "Jersey",
    categorySlug: "jerseys",
    price: 620,
    priceFormatted: "Php 620.00",
    frontImage: mhpnhsFrontImg,
    backImage: mhpnhsBackImg,
    description:
      "MHPNHS squad athletic jersey featuring precision paneling, breathable moisture-management fabric, and vivid sublimated graphics.",
    fabric: "AeroPoly Micro-Knit (170 GSM)",
    printTech: "Zero-Hand Sublimation",
    fit: "Women's Athletic Cut",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
  },
  {
    id: "gwago-stem-synergy-women",
    name: "STEM Synergy Women's Jersey",
    category: "Jersey",
    categorySlug: "jerseys",
    price: 580,
    priceFormatted: "Php 580.00",
    frontImage: synergywFrontImg,
    backImage: synergywBackImg,
    description:
      "Versatile multisport women's team jersey. High-stretch side ventilation panels and soft-touch polyester designed for collegiate and club competition.",
    fabric: "Ventilated DryTech (160 GSM)",
    printTech: "Precision Sublimation",
    fit: "Women's Performance Fit",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
  },
];
