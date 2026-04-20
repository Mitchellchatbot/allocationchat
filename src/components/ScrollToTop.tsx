import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  // Immediate scroll on first render (handles direct URL visits)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll on route changes
  useEffect(() => {
    if (navType !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);

  return null;
};
