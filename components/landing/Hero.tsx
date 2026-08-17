import { ArrowRight, Megaphone, PlayCircle } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="dot-grid hero-grid" aria-hidden="true" />
      <div className="container hero-inner">
        <Reveal className="hero-copy">
          <span className="eyebrow"><Megaphone size={14} /> Promotional SMS for Nigerian businesses</span>
          <h1 id="hero-heading">Send SMS. <span className="blue">Get attention.</span> Make more sales.</h1>
          <p>
            SmsForce helps you send promotional text messages to your customers in Nigeria — sales,
            discounts, new products, weekend offers and special deals. Write your message, choose your
            audience and reach more customers.
          </p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href="/login">Start a Campaign <ArrowRight size={17} /></a>
            <a className="button button-outline button-large" href="#how-it-works"><PlayCircle size={17} /> See How It Works</a>
          </div>
          <p className="hero-note">Built for promotional campaigns in Nigeria. Simple pricing in Naira.</p>
        </Reveal>
        <Reveal delay={120} className="hero-visual"><PhoneMockup /></Reveal>
      </div>
    </section>
  );
}
