// Builds /watches/<slug>-<view>.svg at build time from each watch's `art` block.
import { products } from "../../data/products.js";
import { watchSvg } from "../../lib/watchArt.js";

const VIEWS = ["front", "dial", "salon"];

export function getStaticPaths() {
  return products.filter((p) => p.art && !p.images?.length).flatMap((p) => VIEWS.map((view) => ({ params: { file: `${p.slug}-${view}` }, props: { art: p.art, view } })));
}

export function GET({ props }) {
  return new Response(watchSvg(props.art, props.view), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
