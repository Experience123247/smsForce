import { ArrowRight, Megaphone } from "lucide-react";
import { Reveal } from "./Reveal";
export function FinalCta(){return <section id="pricing" className="section container"><Reveal><div className="final-cta dot-grid"><div className="final-inner"><span className="eyebrow"><Megaphone size={14}/> Ready to promote?</span><h2>Put your next offer in front of your customers.</h2><p>Start a promotional SMS campaign with simple pricing in Naira. Buy the units you need and send when you are ready.</p><div className="cta-row">
    <a className="button button-primary button-large" href="/login">Start a Campaign <ArrowRight size={17}/></a><a className="button button-outline button-large" href="#features">Explore Features</a></div></div></div></Reveal></section>}
