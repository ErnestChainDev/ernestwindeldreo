import logo from "../assets/Logo-mark.webp";
import "./BrandMark.css";

export default function BrandMark({ className = "" }: { className?: string }) {
    return (
        <span className={`home-logo-crop ${className}`}>
            <img src={logo} alt="" draggable={false} />
        </span>
    );
}
