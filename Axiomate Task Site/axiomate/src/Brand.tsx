import { Layers } from "lucide-react";
export default function Brand() {
  return (
    <a className="brand" href="/" aria-label="Axiomate home">
      <span className="logo">
        <Layers size={22} />
      </span>
      axiomate<em>.</em>
    </a>
  );
}
