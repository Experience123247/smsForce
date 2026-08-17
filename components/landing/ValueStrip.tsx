import { Headphones, Megaphone, Wallet, Zap } from "lucide-react";
import { Reveal } from "./Reveal";
const items = [[Megaphone, "Promotional SMS"], [Zap, "Fast campaigns"], [Wallet, "Simple pricing"], [Headphones, "Friendly support"]] as const;
export function ValueStrip() { return <section className="value-strip" aria-label="Why SmsForce"><div className="container value-grid">{items.map(([Icon, label], i) => <Reveal as="div" delay={i*70} key={label}><div className="value-item"><span className="icon-soft"><Icon size={19}/></span><b>{label}</b></div></Reveal>)}</div></section>; }
