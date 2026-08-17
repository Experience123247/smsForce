import { BarChart3, Megaphone, Users } from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  [Megaphone, "Promotional Campaigns", "Create a message for your offer and send it to the customers you want to reach.", ["Weekend sales", "Discount offers", "New product launches"]],
  [BarChart3, "Track Your Campaign", "See campaign activity and delivery status after you send your promotional SMS.", ["Delivery status", "Campaign history", "Simple reporting"]],
  [Users, "Reach Your Audience", "Organise your contacts so you can promote the right offer to the right customers.", ["Contact groups", "Customer lists", "Targeted campaigns"]],
] as const;

export function Features() {
  return <section id="features" className="section container">
    <Reveal className="section-intro">
      <h2>Everything you need to promote your business</h2>
      <p>Simple tools for sending offers, sales messages and special promotions to your customers.</p>
    </Reveal>
    <div className="feature-grid">
      {features.map(([Icon,title,body,points],i)=><Reveal key={title} delay={i*90}>
        <article className="feature-card">
          <span className="feature-icon"><Icon size={21}/></span>
          <h3>{title}</h3>
          <p>{body}</p>
          <ul>{points.map(p=><li key={p}><span/> {p}</li>)}</ul>
        </article>
      </Reveal>)}
    </div>
  </section>;
}
