import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ValueStrip } from "@/components/landing/ValueStrip";
import { Features } from "@/components/landing/Features";
import { MessageShowcase } from "@/components/landing/MessageShowcase";
import { MadeForNigeria } from "@/components/landing/MadeForNigeria";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div id="top" className="page">
      <Navbar />
      <main>
        <Hero />
        <ValueStrip />
        <Features />
        <MessageShowcase />
        <MadeForNigeria />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
