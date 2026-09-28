"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Mail, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import facebookIcon from "@/app/assets/icons/socials/facebook.svg";

interface CustomOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomOrderModal({ open, onOpenChange }: CustomOrderModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const phoneNumber = "0930 932 9091";

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 sm:p-7">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-black tracking-tight uppercase sm:text-3xl">
            CUSTOM DESIGN
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1 text-sm leading-relaxed">
            Looking for custom designs built from scratch?
            <br />
            Chat with our team to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-3">
          <span className="text-muted-foreground font-mono text-sm font-bold tracking-wider uppercase">
            Contact us via:
          </span>

          <div className="divide-border/60 divide-y">
            {/* Facebook Messenger */}
            <div className="flex items-center justify-between gap-3 py-3.5 sm:py-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="bg-muted/80 flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12">
                  <Image
                    src={facebookIcon}
                    alt="Facebook"
                    width={24}
                    height={24}
                    className="size-6"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-sm">Facebook</span>
                  <span className="text-foreground block truncate text-base font-semibold">
                    GwAGO
                  </span>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-border/80 hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 h-9 shrink-0 gap-1.5 rounded-md px-3 font-sans text-xs font-medium"
              >
                <a href="https://m.me/gwagoclothing" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  <span>Open Chat</span>
                </a>
              </Button>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between gap-3 py-3.5 sm:py-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="bg-muted/80 text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12">
                  <Phone className="text-foreground size-5.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-sm">Phone</span>
                  <span className="text-foreground block font-mono text-base font-bold">
                    {phoneNumber}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPhone}
                className="border-border/80 hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 h-9 shrink-0 gap-1.5 rounded-md px-3 font-mono text-xs font-medium"
              >
                {copiedPhone ? (
                  <>
                    <Check className="text-primary size-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between gap-3 py-3.5 sm:py-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="bg-muted/80 text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12">
                  <Mail className="text-foreground size-5.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground block text-sm">Email</span>
                  <span className="text-foreground block truncate font-mono text-base font-bold">
                    wendellgimena@gmail.com
                  </span>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-border/80 hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50 h-9 shrink-0 gap-1.5 rounded-md px-3 font-sans text-xs font-medium"
              >
                <a href="mailto:wendellgimena@gmail.com?subject=Custom%20Order%20Inquiry">
                  <ExternalLink className="size-3.5" />
                  <span>Send Email</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
