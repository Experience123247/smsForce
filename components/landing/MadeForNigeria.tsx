import { CheckCircle2, Percent, ShoppingBag, Store } from "lucide-react";
import { Reveal } from "./Reveal";

const chips=["Weekend offers","Flash sales","Discounts","New arrivals","Special prices","Clearance sales","Product launches","Holiday promotions"];
const points=["Built around how Nigerian businesses promote their products.","Write offers in plain English or the way you speak to your customers.","Use your own business name as the sender ID.","Send promotional campaigns in Naira with simple, clear pricing."];

export function MadeForNigeria(){return <section className="section container"><div className="nigeria-grid">
  <Reveal><span className="eyebrow plain">Made for Nigeria</span><h2>Turn your next offer into a message customers can see</h2><p>From a small shop in Aba to a growing business in Lagos, SmsForce helps you promote products, announce discounts and bring customers back.</p><ul className="check-list">{points.map(p=><li key={p}><CheckCircle2 size={20}/>{p}</li>)}</ul></Reveal>
  <Reveal delay={100}><div className="usecase-card"><div className="usecase-heading"><span className="icon-soft"><Store size={18}/></span><h3>Popular promotional campaigns</h3></div><ul className="chips">{chips.map(c=><li key={c}>{c}</li>)}</ul><p className="sample-message"><Percent size={14}/> “Dear Customer, don't miss our amazing offer this weekend. Enjoy special prices on selected products. Visit us today!”</p><div className="promo-mini"><ShoppingBag size={16}/><span>Simple message. Clear offer. More attention.</span></div></div></Reveal>
</div></section>}
