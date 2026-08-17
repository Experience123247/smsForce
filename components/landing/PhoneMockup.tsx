import { BatteryFull, CheckCheck, Megaphone, Signal, Wifi } from "lucide-react";

export function PhoneMockup() {
  return (
    <div className="phone-wrap">
      <div className="phone-glow" aria-hidden="true" />
      <div className="phone-shell">
        <div className="phone-screen">
          <div className="status-bar"><span>9:41</span><span><Signal size={12}/><Wifi size={12}/><BatteryFull size={14}/></span></div>
          <div className="conversation-head">
            <span className="avatar avatar-blue"><Megaphone size={16}/></span>
            <span><strong>SmsForce</strong><small>Promotional SMS · now</small></span>
            <CheckCheck className="success" size={16}/>
          </div>
          <div className="messages">
            <div className="bubble incoming">
              Dear Customer, don't miss our amazing weekend offer! Enjoy special prices on selected items today.
              <small className="status success"><CheckCheck size={12}/> Read</small>
            </div>
            <div className="bubble incoming">
              Weekend Deal 🔥 Get 20% off your next purchase. Offer ends Sunday. Visit our store today!
              <small className="status success"><CheckCheck size={12}/> Delivered</small>
            </div>
            <div className="bubble outgoing">
              New stock is here! Check out our latest products and enjoy special launch prices this week.
              <small className="status light"><CheckCheck size={12}/> Sent</small>
            </div>
          </div>
        </div>
      </div>
      <div className="floating-notification float-soft">
        <div className="notification-top">
          <span className="avatar avatar-soft"><Megaphone size={14}/></span>
          <span><strong>Weekend Offer</strong><small>Your promotional SMS was delivered</small></span>
        </div>
        <div className="delivered-pill"><CheckCheck size={12}/> Campaign delivered</div>
      </div>
    </div>
  );
}
