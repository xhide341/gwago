import Image from "next/image";
import Link from "next/link";
import logoImg from "@/app/assets/icons/gwago-icon-raw.svg";
import facebookIcon from "@/app/assets/icons/socials/facebook-mono.svg";
import instagramIcon from "@/app/assets/icons/socials/instagram-mono.svg";
import whatsappIcon from "@/app/assets/icons/socials/whatsapp-mono.svg";
import shopeeIcon from "@/app/assets/icons/socials/shopee-mono.svg";

export function FooterSection() {
  return (
    <footer className="bg-background px-4 py-12 lg:px-10 lg:py-16 xl:px-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <div className="flex flex-col items-center justify-between gap-10 lg:flex-row lg:items-start">
          {/* Brand Identity */}
          <div className="flex max-w-md flex-col items-center gap-4 text-center lg:max-w-sm lg:items-start lg:text-left">
            <Link href="/" className="flex items-center justify-center gap-2 lg:justify-start">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full">
                <Image
                  src={logoImg}
                  alt="Gwago Logo"
                  width={40}
                  height={40}
                  className="size-10 rounded-full object-cover dark:invert"
                />
              </div>
              <span className="text-primary font-sans text-2xl font-black tracking-tight">
                GWAGO
              </span>
            </Link>
            <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">
              Established in 2020. GwAGO Printing Services delivers high-performance custom apparel,
              full-sublimation jerseys, and streetwear engineered to endure heavy competition.
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="grid w-full max-w-2xl grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12 lg:w-auto lg:max-w-none">
            <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
              <span className="text-primary font-mono text-xs font-bold tracking-wider uppercase">
                Catalog
              </span>
              <Link
                href="/products"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Basketball Jerseys
              </Link>
              <Link
                href="/products"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Esports Gear
              </Link>
              <Link
                href="/products"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Streetwear Tees
              </Link>
              <Link
                href="/products"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Performance Matrix
              </Link>
            </div>

            <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
              <span className="text-primary font-mono text-xs font-bold tracking-wider uppercase">
                Company
              </span>
              <Link
                href="https://www.facebook.com/gwagoph"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Contact & Quote
              </Link>
              <Link
                href="/order"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Custom Orders
              </Link>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-primary text-xs transition-colors sm:text-sm"
              >
                Staff Portal
              </Link>
            </div>

            <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
              <span className="text-primary font-mono text-xs font-bold tracking-wider uppercase">
                Connect
              </span>
              <div className="flex items-center justify-center gap-3 pt-1 lg:justify-start">
                <Link
                  href="https://www.facebook.com/gwagoph"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="inline-flex size-6 shrink-0 items-center justify-center origin-center opacity-80 transition-all duration-200 ease-out hover:scale-110 hover:opacity-100 active:scale-95"
                >
                  <Image src={facebookIcon} alt="Facebook" width={24} height={24} className="pointer-events-none" />
                </Link>
                <Link
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="inline-flex size-6 shrink-0 items-center justify-center origin-center opacity-80 transition-all duration-200 ease-out hover:scale-110 hover:opacity-100 active:scale-95"
                >
                  <Image src={instagramIcon} alt="Instagram" width={24} height={24} className="pointer-events-none" />
                </Link>
                <Link
                  href="https://wa.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="inline-flex size-6 shrink-0 items-center justify-center origin-center opacity-80 transition-all duration-200 ease-out hover:scale-110 hover:opacity-100 active:scale-95"
                >
                  <Image src={whatsappIcon} alt="WhatsApp" width={24} height={24} className="pointer-events-none" />
                </Link>
                <Link
                  href="https://shopee.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Shopee"
                  className="inline-flex size-6 shrink-0 items-center justify-center origin-center opacity-80 transition-all duration-200 ease-out hover:scale-110 hover:opacity-100 active:scale-95"
                >
                  <Image src={shopeeIcon} alt="Shopee" width={24} height={24} className="pointer-events-none" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-border text-muted-foreground flex flex-col items-center justify-between gap-4 border-t pt-6 text-center text-xs sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} GWAGO Printing Services. All rights reserved.</p>
          <p className="font-mono text-[11px] tracking-wider uppercase">NOT FOR EVERYBODY</p>
        </div>
      </div>
    </footer>
  );
}

export default FooterSection;
