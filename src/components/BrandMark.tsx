import logo from "../assets/Logo.png";
import "./BrandMark.css";

export default function BrandMark({ className = "" }: { className?: string }) {
    return (
        <span className={`home-logo-crop ${className}`}>
            <img src={logo} alt="" draggable={false} />
        </span>
    );
}

