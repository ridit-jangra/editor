import { Style } from "../types";
import { style as GlassStyle } from "../styles/glass";

export function getStyle(style: Style) {
  if (style === "glass") return GlassStyle;
  else return "";
}
