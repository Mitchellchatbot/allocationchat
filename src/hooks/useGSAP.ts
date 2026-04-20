import { useEffect, useRef, RefObject } from 'react';
import gsap from 'gsap';

interface UseGSAPOptions {
  trigger?: 'mount' | 'none';
  delay?: number;
}

// Fade in animation
export const useFadeIn = <T extends HTMLElement>(
  options: UseGSAPOptions = {}
): RefObject<T> => {
  const ref = useRef<T>(null);
  const { trigger = 'mount', delay = 0 } = options;

  useEffect(() => {
    if (!ref.current || trigger === 'none') return;

    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 20 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.5, 
        delay,
        ease: 'power3.out' 
      }
    );
  }, [trigger, delay]);

  return ref;
};

// Stagger children animation
export const useStaggerChildren = <T extends HTMLElement>(
  selector: string,
  options: UseGSAPOptions = {}
): RefObject<T> => {
  const ref = useRef<T>(null);
  const { trigger = 'mount', delay = 0 } = options;

  useEffect(() => {
    if (!ref.current || trigger === 'none') return;

    const children = ref.current.querySelectorAll(selector);
    
    gsap.fromTo(
      children,
      { opacity: 0, y: 15 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.4, 
        delay,
        stagger: 0.08,
        ease: 'power2.out' 
      }
    );
  }, [selector, trigger, delay]);

  return ref;
};

// Scale in animation for cards
export const useScaleIn = <T extends HTMLElement>(
  options: UseGSAPOptions = {}
): RefObject<T> => {
  const ref = useRef<T>(null);
  const { trigger = 'mount', delay = 0 } = options;

  useEffect(() => {
    if (!ref.current || trigger === 'none') return;

    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.95 },
      { 
        opacity: 1, 
        scale: 1, 
        duration: 0.4, 
        delay,
        ease: 'back.out(1.5)' 
      }
    );
  }, [trigger, delay]);

  return ref;
};

// Slide in from side animation
export const useSlideIn = <T extends HTMLElement>(
  direction: 'left' | 'right' | 'top' | 'bottom' = 'left',
  options: UseGSAPOptions = {}
): RefObject<T> => {
  const ref = useRef<T>(null);
  const { trigger = 'mount', delay = 0 } = options;

  useEffect(() => {
    if (!ref.current || trigger === 'none') return;

    const fromVars: gsap.TweenVars = { opacity: 0 };
    
    switch (direction) {
      case 'left':
        fromVars.x = -30;
        break;
      case 'right':
        fromVars.x = 30;
        break;
      case 'top':
        fromVars.y = -30;
        break;
      case 'bottom':
        fromVars.y = 30;
        break;
    }

    gsap.fromTo(
      ref.current,
      fromVars,
      { 
        opacity: 1, 
        x: 0, 
        y: 0, 
        duration: 0.5, 
        delay,
        ease: 'power3.out' 
      }
    );
  }, [direction, trigger, delay]);

  return ref;
};

// Hover animation helper
export const createHoverAnimation = (element: HTMLElement) => {
  const tl = gsap.timeline({ paused: true });
  
  tl.to(element, {
    scale: 1.02,
    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)',
    duration: 0.2,
    ease: 'power2.out'
  });

  return {
    onMouseEnter: () => tl.play(),
    onMouseLeave: () => tl.reverse()
  };
};

// Button press animation
export const animateButtonPress = (element: HTMLElement) => {
  gsap.to(element, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1
  });
};

// Page transition animation
export const usePageTransition = <T extends HTMLElement>(): RefObject<T> => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current) return;

    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 10 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.4, 
        ease: 'power2.out' 
      }
    );
  }, []);

  return ref;
};

// Animate list items
export const animateListItems = (container: HTMLElement, selector: string) => {
  const items = container.querySelectorAll(selector);
  
  gsap.fromTo(
    items,
    { opacity: 0, x: -10 },
    { 
      opacity: 1, 
      x: 0, 
      duration: 0.3, 
      stagger: 0.05,
      ease: 'power2.out' 
    }
  );
};
