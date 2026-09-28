import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SmoothScrollProvider>{children}</SmoothScrollProvider>;
}
