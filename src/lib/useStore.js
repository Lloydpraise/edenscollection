import { useSyncExternalStore } from "react";
import { getCart, subscribeCart, getWishlist, subscribeWishlist } from "./cart.js";

const serverEmpty = () => [];

export const useCart = () => useSyncExternalStore(subscribeCart, getCart, serverEmpty);
export const useWishlist = () => useSyncExternalStore(subscribeWishlist, getWishlist, serverEmpty);
