import { MessageSquareText } from "lucide-react";

export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true"><MessageSquareText size={18} /></span>
      <span>Sms<span className="blue">Force</span></span>
    </span>
  );
}
