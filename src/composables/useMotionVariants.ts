import { stagger } from "motion-v";

type StaggerOptions = NonNullable<Parameters<typeof stagger>[1]>;

export function contentVariants(staggerVal = 0.08, staggerOptions?: StaggerOptions) {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { delayChildren: stagger(staggerVal, staggerOptions) },
    },
  };
}

export const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function listContainerVariants(staggerVal = 0.08) {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { delayChildren: stagger(staggerVal) },
    },
  };
}

export const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } },
};
