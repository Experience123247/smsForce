import { Check, CheckCheck, Megaphone, Percent, ShoppingBag, Sparkles } from "lucide-react";
import { Reveal } from "./Reveal";

const messages = [
  {kind:"Weekend Sale",Icon:Percent,to:"All Customers",initials:"WS",text:"Weekend offer! Get 20% off selected items. Shop today and enjoy the deal before it ends.",state:"Delivered",time:"1m"},
  {kind:"New Product",Icon:Sparkles,to:"VIP Customers",initials:"NP",text:"New stock just landed! Be among the first to see our latest collection at special launch prices.",state:"Read",time:"3m"},
  {kind:"Special Offer",Icon:ShoppingBag,to:"Saturday Buyers",initials:"SO",text:"Special deal today only. Buy more and save more. Visit our store before 6pm.",state:"Sent",time:"12m"},
  {kind:"Flash Sale",Icon:Megaphone,to:"Lagos Customers",initials:"FS",text:"Flash sale starts now! Selected products are going for less today. Don't miss it!",state:"Delivered",time:"now"},
] as const;

export function MessageShowcase(){return <section className="message-section"><div className="container section">
  <Reveal className="section-intro"><h2>Show customers an offer they want to see</h2><p>Promotional SMS is short, direct and easy to understand. Keep your customers informed about your best deals.</p></Reveal>
  <ul className="message-grid">{messages.map((m,i)=><Reveal as="li" key={m.kind} delay={i*80}><article className="message-card"><header><div className="recipient"><span className="avatar avatar-dark">{m.initials}</span><span><strong>{m.to}</strong><small><m.Icon size={12}/> {m.kind} · {m.time}</small></span></div><span className={`status-chip ${m.state.toLowerCase()}`}>{m.state === "Sent" ? <Check size={12}/> : <CheckCheck size={12}/>} {m.state}</span></header><p>{m.text}</p></article></Reveal>)}</ul>
</div></section>}
